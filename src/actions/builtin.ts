import type { DocumentType } from "../constants";
import { trashService } from "../services/trash.svelte";
import type { IndexEntry } from "../services/types";
import { chunk, groupBy } from "../util/batch";
import { t } from "../util/i18n";
import { registerAction } from "./registry";

const CHUNK_SIZE = 100;

const isWorld = (e: IndexEntry) => !e.packId;
const isPack = (e: IndexEntry) => !!e.packId;

/** Une seule cible de dossier n'a de sens que pour un seul type de document. */
function singleType(entries: IndexEntry[]): string | null {
  return new Set(entries.map((e) => e.documentName)).size > 1 ? "Actions.SingleTypeRequired" : null;
}

async function resolve(entries: IndexEntry[]): Promise<any[]> {
  const docs = await Promise.all(entries.map((e) => fromUuid(e.uuid)));
  return docs.filter(Boolean);
}

/** Met à jour des documents du monde par lots, type par type. */
async function updateInChunks(
  entries: IndexEntry[],
  change: (entry: IndexEntry) => Record<string, unknown>,
): Promise<number> {
  for (const [documentName, group] of groupBy(entries, (e) => e.documentName)) {
    const cls = CONFIG[documentName].documentClass;
    for (const part of chunk(group, CHUNK_SIZE)) {
      await cls.updateDocuments(part.map((e) => ({ _id: e.id, ...change(e) })));
    }
  }
  return entries.length;
}

export function registerBuiltinActions(): void {
  registerAction({
    id: "trash",
    label: "Trash",
    icon: "fa-solid fa-trash",
    gmOnly: true,
    destructive: true,
    dialog: "confirm-trash",
    appliesTo: isWorld,
    run: async (entries) => trashService.trash(await resolve(entries)),
  });

  registerAction({
    id: "move",
    label: "Move",
    icon: "fa-solid fa-folder-open",
    gmOnly: true,
    dialog: "folder",
    appliesTo: isWorld,
    validate: singleType,
    run: (entries, { folderId }) => updateInChunks(entries, () => ({ folder: folderId ?? null })),
  });

  registerAction({
    id: "duplicate",
    label: "Duplicate",
    icon: "fa-solid fa-copy",
    gmOnly: true,
    dialog: "confirm",
    appliesTo: isWorld,
    run: async (entries) => {
      const docs = await resolve(entries);
      for (const [documentName, group] of groupBy(docs, (d) => d.documentName as DocumentType)) {
        const data = group.map((doc) => {
          const source = doc.toObject();
          delete source._id;
          source.name = t("Actions.CopyName", { name: source.name });
          return source;
        });
        for (const part of chunk(data, CHUNK_SIZE)) {
          await CONFIG[documentName].documentClass.createDocuments(part);
        }
      }
      return docs.length;
    },
  });

  registerAction({
    id: "ownership",
    label: "Ownership",
    icon: "fa-solid fa-lock",
    gmOnly: true,
    dialog: "ownership",
    appliesTo: isWorld,
    run: (entries, { ownership }) =>
      updateInChunks(entries, () => ({ "ownership.default": ownership ?? 0 })),
  });

  registerAction({
    id: "import",
    label: "Import",
    icon: "fa-solid fa-file-import",
    gmOnly: true,
    dialog: "folder",
    appliesTo: isPack,
    validate: singleType,
    run: async (entries, { folderId }) => {
      // Copie vers le monde : le compendium source n'est jamais modifié.
      for (const entry of entries) {
        const pack = game.packs.get(entry.packId);
        const collection = game.collections.get(entry.documentName);
        await collection.importFromCompendium(pack, entry.id, { folder: folderId ?? null });
      }
      return entries.length;
    },
  });
}
