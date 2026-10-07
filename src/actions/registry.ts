import type { IndexEntry } from "../services/types";

/** Interface de saisie demandée avant d'exécuter une action. */
export type ActionDialog = "confirm" | "confirm-trash" | "folder" | "ownership";

export interface ActionParams {
  folderId?: string | null;
  ownership?: number;
}

export interface ArchiveAction {
  id: string;
  /** Clé de traduction sous ARCHIVE_NAVIGATOR.Actions. */
  label: string;
  icon: string;
  /** Réservée au MJ : prépare la future version joueurs. */
  gmOnly: boolean;
  destructive?: boolean;
  dialog: ActionDialog;
  /** L'action s'applique-t-elle à cet élément ? Les autres sont ignorés. */
  appliesTo(entry: IndexEntry): boolean;
  /** Contrainte sur l'ensemble des éléments retenus (ex. un seul type pour un déplacement). */
  validate?(entries: IndexEntry[]): string | null;
  run(entries: IndexEntry[], params: ActionParams): Promise<number>;
}

const actions: ArchiveAction[] = [];

export function registerAction(action: ArchiveAction): void {
  const existing = actions.findIndex((a) => a.id === action.id);
  if (existing >= 0) actions.splice(existing, 1, action);
  else actions.push(action);
}

export function getActions(): readonly ArchiveAction[] {
  return actions;
}

export interface ActionAvailability {
  action: ArchiveAction;
  applicable: IndexEntry[];
  /** Clé de traduction expliquant pourquoi l'action est indisponible. */
  reason: string | null;
}

/** Calcule, pour une sélection donnée, quelles actions sont proposées et sur quels éléments. */
export function availableActions(entries: IndexEntry[], isGM: boolean): ActionAvailability[] {
  return actions
    .filter((action) => isGM || !action.gmOnly)
    .map((action) => {
      const applicable = entries.filter((e) => action.appliesTo(e));
      const reason = !applicable.length
        ? "Actions.NotApplicable"
        : (action.validate?.(applicable) ?? null);
      return { action, applicable, reason };
    });
}
