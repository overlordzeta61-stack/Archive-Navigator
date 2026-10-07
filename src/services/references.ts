import type { IndexEntry } from "./types";
import { t } from "../util/i18n";

/**
 * Repère où des documents du monde sont utilisés, pour avertir avant une
 * suppression : tokens sur des scènes, liens dans les journaux, propriétaires
 * joueurs, scène active.
 */
export function findUsage(entries: readonly IndexEntry[]): Map<string, string[]> {
  const warnings = new Map<string, string[]>();
  const add = (uuid: string, message: string) => {
    const list = warnings.get(uuid) ?? [];
    list.push(message);
    warnings.set(uuid, list);
  };
  const world = entries.filter((e) => !e.packId);
  if (!world.length) return warnings;

  // Tokens d'acteurs posés sur des scènes.
  const actorIds = new Map(world.filter((e) => e.documentName === "Actor").map((e) => [e.id, e]));
  if (actorIds.size) {
    const tokenCounts = new Map<string, number>();
    for (const scene of game.scenes) {
      for (const token of scene.tokens) {
        if (token.actorId && actorIds.has(token.actorId)) {
          tokenCounts.set(token.actorId, (tokenCounts.get(token.actorId) ?? 0) + 1);
        }
      }
    }
    for (const [id, count] of tokenCounts) add(actorIds.get(id)!.uuid, t("Usage.Tokens", { count }));
    for (const entry of actorIds.values()) {
      if (game.actors.get(entry.id)?.hasPlayerOwner) add(entry.uuid, t("Usage.PlayerOwned"));
    }
  }

  // Scène active.
  for (const entry of world.filter((e) => e.documentName === "Scene")) {
    if (game.scenes.get(entry.id)?.active) add(entry.uuid, t("Usage.ActiveScene"));
  }

  // Liens @UUID[...] (ou ancienne syntaxe @Type[id]) dans les pages de journaux.
  const linkCounts = new Map<string, number>();
  const patterns = world.map((e) => ({ entry: e, uuid: e.uuid, legacy: `@${e.documentName}[${e.id}]` }));
  for (const journal of game.journal) {
    for (const page of journal.pages) {
      const text: string | undefined = page.text?.content;
      if (!text || !text.includes("@")) continue;
      for (const p of patterns) {
        if (p.entry.documentName === "JournalEntry" && p.entry.id === journal.id) continue;
        if (text.includes(`@UUID[${p.uuid}`) || text.includes(p.legacy)) {
          linkCounts.set(p.uuid, (linkCounts.get(p.uuid) ?? 0) + 1);
        }
      }
    }
  }
  for (const [uuid, count] of linkCounts) add(uuid, t("Usage.Links", { count }));

  return warnings;
}
