import { DOCUMENT_TYPES, WORLD_COLLECTIONS, type DocumentType } from "../constants";
import { normalize } from "../util/search";
import type { FolderEntry, IndexEntry } from "./types";

const REBUILD_DELAY = 150;

/**
 * Index unifié du contenu : documents du monde (tenus à jour via les hooks
 * Foundry) et index des compendiums (chargé à la demande, en lecture seule).
 */
class IndexService {
  world = $state.raw<IndexEntry[]>([]);
  folders = $state.raw<FolderEntry[]>([]);
  compendia = $state.raw<IndexEntry[]>([]);
  compendiaStatus = $state<"idle" | "loading" | "ready">("idle");

  #hooks: [string, number][] = [];
  #timer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    if (this.#hooks.length) return;
    this.rebuildWorld();
    const docs = [...DOCUMENT_TYPES, "Folder"];
    for (const doc of docs) {
      for (const event of ["create", "update", "delete"]) {
        const hook = `${event}${doc}`;
        this.#hooks.push([hook, Hooks.on(hook, () => this.#scheduleRebuild())]);
      }
    }
  }

  stop(): void {
    for (const [hook, id] of this.#hooks) Hooks.off(hook, id);
    this.#hooks = [];
  }

  /** Reconstruit l'index du monde. Peu coûteux même pour plusieurs milliers de documents. */
  rebuildWorld(): void {
    const entries: IndexEntry[] = [];
    for (const documentName of DOCUMENT_TYPES) {
      const collection = game[WORLD_COLLECTIONS[documentName]];
      if (!collection) continue;
      for (const doc of collection) entries.push(worldEntry(documentName, doc));
    }
    this.world = entries;
    this.folders = [...game.folders]
      .filter((f: any) => (DOCUMENT_TYPES as readonly string[]).includes(f.type))
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        documentName: f.type,
        parentId: f.folder?.id ?? null,
        color: f.color?.css ?? f.color ?? null,
        sort: f.sort ?? 0,
      }));
  }

  /** Charge l'index de tous les compendiums (une seule fois). */
  async loadCompendia(): Promise<void> {
    if (this.compendiaStatus !== "idle") return;
    this.compendiaStatus = "loading";
    const entries: IndexEntry[] = [];
    for (const pack of game.packs) {
      const documentName = pack.documentName as DocumentType;
      if (!DOCUMENT_TYPES.includes(documentName)) continue;
      if (!pack.visible) continue;
      const index = await pack.getIndex({ fields: ["img", "type", "folder"] });
      for (const e of index) {
        entries.push({
          uuid: e.uuid ?? `Compendium.${pack.collection}.${documentName}.${e._id}`,
          id: e._id,
          name: e.name ?? "",
          searchName: normalize(e.name ?? ""),
          documentName,
          subtype: e.type ?? null,
          img: e.img ?? null,
          folderId: e.folder ?? null,
          packId: pack.collection,
        });
      }
    }
    this.compendia = entries;
    this.compendiaStatus = "ready";
  }

  /** Retrouve une entrée du monde ou d'un compendium déjà indexé. */
  find(uuid: string): IndexEntry | undefined {
    return this.world.find((e) => e.uuid === uuid) ?? this.compendia.find((e) => e.uuid === uuid);
  }

  #scheduleRebuild(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.rebuildWorld();
    }, REBUILD_DELAY);
  }
}

function worldEntry(documentName: DocumentType, doc: any): IndexEntry {
  const name: string = doc.name ?? "";
  return {
    uuid: doc.uuid,
    id: doc.id,
    name,
    searchName: normalize(name),
    documentName,
    subtype: doc.type && doc.type !== "base" ? doc.type : null,
    img: doc.img ?? doc.thumb ?? null,
    folderId: doc.folder?.id ?? null,
    packId: null,
  };
}

export const indexService = new IndexService();
