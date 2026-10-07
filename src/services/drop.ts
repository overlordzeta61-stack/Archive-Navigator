import { getActions } from "../actions/registry";
import type { IndexEntry } from "./types";
import { t } from "../util/i18n";
import { gridPositions, payloadUuids, planFolderDrop, type DragPayload } from "../util/drop";
import { indexService } from "./index.svelte";

async function runAction(id: string, entries: IndexEntry[], folderId: string | null): Promise<void> {
  if (!entries.length) return;
  const action = getActions().find((a) => a.id === id);
  await action?.run(entries, { folderId });
}

/**
 * Dépôt sur un dossier du navigateur (ou sur la racine, folderId = null) :
 * déplace les documents du monde, importe les entrées de compendium,
 * rattache les dossiers. Les éléments d'un autre type sont ignorés.
 */
export async function dropOnFolder(
  payload: DragPayload,
  target: { folderId: string | null; documentName: string },
): Promise<void> {
  const uuids = payloadUuids(payload);
  if (uuids.some((u) => u.startsWith("Compendium."))) await indexService.loadCompendia();

  const plan = planFolderDrop(uuids, target, (u) => indexService.find(u), indexService.folders);
  try {
    await runAction("move", plan.move, target.folderId);
    await runAction("import", plan.import, target.folderId);
    if (plan.folders.length) {
      await CONFIG.Folder.documentClass.updateDocuments(
        plan.folders.map((id) => ({ _id: id, folder: target.folderId })),
      );
    }
  } catch (error) {
    console.error(error);
    ui.notifications.error(t("Drop.Failed"));
    return;
  }

  const done = plan.move.length + plan.import.length + plan.folders.length;
  if (done) ui.notifications.info(t("Drop.Done", { count: done }));
  if (plan.ignored) ui.notifications.warn(t("Drop.Ignored", { count: plan.ignored }));
}

async function resolveAll(uuids: string[]): Promise<any[]> {
  return (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
}

/**
 * Crochet `dropCanvasData` : plusieurs acteurs glissés depuis le navigateur
 * sont posés en grille autour du point de dépôt. Un dépôt simple est laissé
 * au comportement natif de Foundry.
 */
export function onDropCanvasData(canvas: any, data: any): boolean | void {
  if (!(data?.uuids?.length > 1) || !game.user.isGM) return;
  placeTokens(canvas, data).catch((error) => {
    console.error(error);
    ui.notifications.error(t("Drop.Failed"));
  });
  return false;
}

async function placeTokens(canvas: any, data: any): Promise<void> {
  const docs = (await resolveAll(data.uuids)).filter((d) => d.documentName === "Actor");
  if (!docs.length || !canvas.scene) return;

  // Un acteur de compendium doit d'abord exister dans le monde.
  const actors: any[] = [];
  for (const doc of docs) {
    actors.push(doc.pack ? await game.actors.importFromCompendium(game.packs.get(doc.pack), doc.id) : doc);
  }

  const gridSize: number = canvas.grid.size;
  const span = Math.max(1, ...actors.map((a) => a.prototypeToken?.width ?? 1));
  const center = { x: data.x ?? canvas.dimensions.width / 2, y: data.y ?? canvas.dimensions.height / 2 };
  const positions = gridPositions(actors.length, center, gridSize * span);

  const tokens = [];
  for (const [i, actor] of actors.entries()) {
    let { x, y } = positions[i];
    const snapped = canvas.grid.getSnappedPoint?.(
      { x, y },
      { mode: CONST.GRID_SNAPPING_MODES?.TOP_LEFT_CORNER },
    );
    if (snapped) ({ x, y } = snapped);
    const token = await actor.getTokenDocument({ x, y });
    tokens.push(token.toObject());
  }
  await canvas.scene.createEmbeddedDocuments("Token", tokens);
}

/**
 * Crochet `dropActorSheetData` : plusieurs objets glissés sur une fiche
 * d'acteur sont tous ajoutés à son inventaire.
 */
export function onDropActorSheetData(actor: any, _sheet: unknown, data: any): boolean | void {
  if (!(data?.uuids?.length > 1) || !actor?.isOwner) return;
  const hasItems = data.uuids.some((u: string) => /(^|\.)Item\.[^.]+$/.test(u));
  if (!hasItems) return;
  addItems(actor, data.uuids).catch((error) => {
    console.error(error);
    ui.notifications.error(t("Drop.Failed"));
  });
  return false;
}

async function addItems(actor: any, uuids: string[]): Promise<void> {
  const items = (await resolveAll(uuids)).filter((d) => d.documentName === "Item");
  const data = items.map((item) => {
    const source = item.toObject();
    delete source._id;
    return source;
  });
  await actor.createEmbeddedDocuments("Item", data);
  ui.notifications.info(t("Drop.ItemsAdded", { count: data.length, actor: actor.name }));
}
