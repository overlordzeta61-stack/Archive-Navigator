import { MODULE_ID, type DocumentType } from "../constants";
import { getSetting, SETTINGS } from "../settings";
import { groupBy } from "../util/batch";
import { t } from "../util/i18n";
import {
  ageInDays,
  fromAdventureContent,
  prepareRestore,
  toAdventureContent,
  type TrashedSource,
} from "../util/trash";

const PACK_NAME = "archive-navigator-trash";
const PACK_ID = `world.${PACK_NAME}`;

export interface TrashBatch {
  id: string;
  name: string;
  deletedAt: number;
  count: number;
  counts: Partial<Record<DocumentType, number>>;
}

interface BatchFlags {
  deletedAt: number;
  count: number;
  counts: Partial<Record<DocumentType, number>>;
}

/**
 * Corbeille : un compendium de type Adventure créé et géré par le module.
 * Chaque suppression groupée y devient une Adventure contenant les documents
 * supprimés avec leurs identifiants d'origine. Les compendiums de
 * l'utilisateur ne sont jamais touchés.
 */
class TrashService {
  batches = $state.raw<TrashBatch[]>([]);

  get pack(): any {
    return game.packs.get(PACK_ID) ?? null;
  }

  /** Met en corbeille des documents du monde, puis les supprime. */
  async trash(docs: any[]): Promise<number> {
    if (!docs.length) return 0;
    const pack = await this.#ensurePack();
    const sources: TrashedSource[] = docs.map((doc) => ({
      documentName: doc.documentName,
      data: doc.toObject(),
    }));
    const counts: Partial<Record<DocumentType, number>> = {};
    for (const s of sources) counts[s.documentName] = (counts[s.documentName] ?? 0) + 1;
    const deletedAt = Date.now();
    const flags: BatchFlags = { deletedAt, count: sources.length, counts };

    // La sauvegarde doit réussir avant toute suppression.
    await CONFIG.Adventure.documentClass.create(
      {
        name: t("Trash.BatchName", {
          date: new Date(deletedAt).toLocaleString(),
          count: sources.length,
        }),
        ...toAdventureContent(sources),
        flags: { [MODULE_ID]: flags },
      },
      { pack: pack.collection },
    );

    for (const [documentName, group] of groupBy(docs, (d) => d.documentName as DocumentType)) {
      await CONFIG[documentName].documentClass.deleteDocuments(group.map((d) => d.id));
    }
    await this.refresh();
    return sources.length;
  }

  /** Liste les documents d'un lot, pour une restauration partielle. */
  async contents(batchId: string): Promise<TrashedSource[]> {
    const adventure = await this.pack?.getDocument(batchId);
    return adventure ? fromAdventureContent(adventure.toObject()) : [];
  }

  /** Restaure tout un lot, ou seulement les documents dont l'identifiant est donné. */
  async restore(batchId: string, ids?: string[]): Promise<number> {
    const adventure = await this.pack?.getDocument(batchId);
    if (!adventure) return 0;
    const all = fromAdventureContent(adventure.toObject());
    const wanted = ids ? new Set(ids) : null;
    const toRestore = wanted ? all.filter((s) => wanted.has(s.data._id)) : all;

    for (const [documentName, group] of groupBy(toRestore, (s) => s.documentName)) {
      const collection = game.collections.get(documentName);
      const kept: any[] = [];
      const renewed: any[] = [];
      for (const { data } of group) {
        const prepared = prepareRestore(
          data,
          (id) => game.folders.has(id),
          (id) => collection.has(id),
        );
        (prepared.keepId ? kept : renewed).push(prepared.data);
      }
      const cls = CONFIG[documentName].documentClass;
      if (kept.length) await cls.createDocuments(kept, { keepId: true });
      if (renewed.length) await cls.createDocuments(renewed);
    }

    const restoredIds = new Set(toRestore.map((s) => s.data._id));
    const remaining = all.filter((s) => !restoredIds.has(s.data._id));
    if (remaining.length) {
      const content = toAdventureContent(remaining);
      const counts: Partial<Record<DocumentType, number>> = {};
      for (const s of remaining) counts[s.documentName] = (counts[s.documentName] ?? 0) + 1;
      await adventure.update({
        ...content,
        [`flags.${MODULE_ID}.count`]: remaining.length,
        [`flags.${MODULE_ID}.counts`]: counts,
      });
    } else {
      await adventure.delete();
    }
    await this.refresh();
    return toRestore.length;
  }

  /** Supprime définitivement des lots. */
  async purge(batchIds: string[]): Promise<void> {
    const pack = this.pack;
    if (!pack || !batchIds.length) return;
    await CONFIG.Adventure.documentClass.deleteDocuments(batchIds, { pack: pack.collection });
    await this.refresh();
  }

  /** Vide les lots plus anciens que la durée de conservation (0 = jamais). */
  async purgeExpired(): Promise<void> {
    const days = getSetting<number>(SETTINGS.trashRetentionDays);
    if (!days) return;
    await this.refresh();
    const expired = this.batches.filter((b) => ageInDays(b.deletedAt) > days).map((b) => b.id);
    await this.purge(expired);
  }

  async refresh(): Promise<void> {
    const pack = this.pack;
    if (!pack) {
      this.batches = [];
      return;
    }
    const index = await pack.getIndex({ fields: [`flags.${MODULE_ID}`] });
    this.batches = [...index]
      .map((e: any) => {
        const flags: Partial<BatchFlags> = e.flags?.[MODULE_ID] ?? {};
        return {
          id: e._id,
          name: e.name,
          deletedAt: flags.deletedAt ?? 0,
          count: flags.count ?? 0,
          counts: flags.counts ?? {},
        };
      })
      .sort((a, b) => b.deletedAt - a.deletedAt);
  }

  async #ensurePack(): Promise<any> {
    if (this.pack) return this.pack;
    const CompendiumCollection =
      foundry.documents?.collections?.CompendiumCollection ?? (globalThis as any).CompendiumCollection;
    return CompendiumCollection.createCompendium({
      type: "Adventure",
      label: t("Trash.PackLabel"),
      name: PACK_NAME,
    });
  }
}

export const trashService = new TrashService();
