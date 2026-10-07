import type { FolderEntry, IndexEntry } from "../services/types";

/**
 * Données glissées. `type` et `uuid` suivent le format natif de Foundry (un
 * seul document) ; `uuids` porte la sélection complète quand plusieurs
 * éléments sont glissés. Une cible Foundry qui ignore `uuids` reçoit donc
 * au moins le premier élément au lieu d'une erreur.
 */
export interface DragPayload {
  type: string;
  uuid: string;
  uuids?: string[];
}

export function parsePayload(raw: string | undefined | null): DragPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data && typeof data.type === "string" && typeof data.uuid === "string" ? data : null;
  } catch {
    return null;
  }
}

export function payloadUuids(payload: DragPayload): string[] {
  return payload.uuids?.length ? payload.uuids : [payload.uuid];
}

/** Construit les données glissées : la sélection entière si la ligne en fait partie. */
export function buildPayload(dragged: IndexEntry, selected: IndexEntry[]): DragPayload {
  const inSelection = selected.some((e) => e.uuid === dragged.uuid);
  const group = inSelection && selected.length > 1 ? selected : [dragged];
  // Le premier élément est celui saisi : c'est lui que reçoit une cible native.
  const ordered = [dragged, ...group.filter((e) => e.uuid !== dragged.uuid)];
  const payload: DragPayload = { type: dragged.documentName, uuid: dragged.uuid };
  if (ordered.length > 1) payload.uuids = ordered.map((e) => e.uuid);
  return payload;
}

export interface FolderDropPlan {
  /** Documents du monde à déplacer dans le dossier. */
  move: IndexEntry[];
  /** Entrées de compendium à importer dans le dossier. */
  import: IndexEntry[];
  /** Dossiers à rattacher sous le dossier cible. */
  folders: string[];
  /** Éléments ignorés (autre type, déjà en place, cycle…). */
  ignored: number;
}

/**
 * Décide ce que produit un dépôt sur un dossier (ou sur la racine d'un type,
 * folderId = null). Seuls les éléments du même type que le dossier sont pris.
 */
export function planFolderDrop(
  uuids: readonly string[],
  target: { folderId: string | null; documentName: string },
  lookup: (uuid: string) => IndexEntry | undefined,
  folders: readonly FolderEntry[],
): FolderDropPlan {
  const plan: FolderDropPlan = { move: [], import: [], folders: [], ignored: 0 };
  const byId = new Map(folders.map((f) => [f.id, f]));

  for (const uuid of uuids) {
    if (uuid.startsWith("Folder.")) {
      const folder = byId.get(uuid.slice("Folder.".length));
      const valid =
        folder &&
        folder.documentName === target.documentName &&
        folder.parentId !== target.folderId &&
        !isSelfOrDescendant(target.folderId, folder.id, byId);
      if (valid) plan.folders.push(folder.id);
      else plan.ignored++;
      continue;
    }
    const entry = lookup(uuid);
    if (!entry || entry.documentName !== target.documentName) plan.ignored++;
    else if (entry.packId) plan.import.push(entry);
    else if (entry.folderId === target.folderId) plan.ignored++;
    else plan.move.push(entry);
  }
  return plan;
}

/** `candidate` est-il `ancestorId` lui-même ou l'un de ses descendants ? */
function isSelfOrDescendant(
  candidate: string | null,
  ancestorId: string,
  byId: Map<string, FolderEntry>,
): boolean {
  let current = candidate;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    current = byId.get(current)?.parentId ?? null;
  }
  return false;
}

/**
 * Positions (coin supérieur gauche) pour poser `count` tokens en grille
 * centrée sur un point, `cell` étant la taille d'une case.
 */
export function gridPositions(
  count: number,
  center: { x: number; y: number },
  cell: number,
): { x: number; y: number }[] {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const originX = center.x - (cols * cell) / 2;
  const originY = center.y - (rows * cell) / 2;
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round(originX + (i % cols) * cell),
    y: Math.round(originY + Math.floor(i / cols) * cell),
  }));
}
