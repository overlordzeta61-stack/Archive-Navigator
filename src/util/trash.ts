import type { DocumentType } from "../constants";

/** Champ d'un document Adventure correspondant à chaque type de document. */
export const ADVENTURE_FIELDS: Record<DocumentType, string> = {
  Actor: "actors",
  Item: "items",
  JournalEntry: "journal",
  Scene: "scenes",
  RollTable: "tables",
  Macro: "macros",
  Playlist: "playlists",
  Cards: "cards",
};

export interface TrashedSource {
  documentName: DocumentType;
  data: Record<string, any> & { _id: string; name?: string };
}

/** Répartit des données de documents dans les champs d'une Adventure. */
export function toAdventureContent(sources: TrashedSource[]): Record<string, any[]> {
  const content: Record<string, any[]> = {};
  for (const field of Object.values(ADVENTURE_FIELDS)) content[field] = [];
  for (const { documentName, data } of sources) content[ADVENTURE_FIELDS[documentName]].push(data);
  return content;
}

/** Opération inverse : liste les documents contenus dans une Adventure de la corbeille. */
export function fromAdventureContent(adventure: Record<string, any>): TrashedSource[] {
  const sources: TrashedSource[] = [];
  for (const [documentName, field] of Object.entries(ADVENTURE_FIELDS)) {
    for (const data of adventure[field] ?? []) {
      sources.push({ documentName: documentName as DocumentType, data });
    }
  }
  return sources;
}

/**
 * Prépare des données pour la restauration : le dossier d'origine est retiré
 * s'il n'existe plus, et l'identifiant n'est conservé que s'il est libre
 * (les liens @UUID redeviennent alors valides).
 */
export function prepareRestore(
  data: Record<string, any>,
  folderExists: (id: string) => boolean,
  idTaken: (id: string) => boolean,
): { data: Record<string, any>; keepId: boolean } {
  const copy = structuredClone(data);
  if (copy.folder && !folderExists(copy.folder)) copy.folder = null;
  const keepId = !idTaken(copy._id);
  if (!keepId) delete copy._id;
  return { data: copy, keepId };
}

/** Nombre de jours écoulés depuis un horodatage. */
export function ageInDays(timestamp: number, now = Date.now()): number {
  return (now - timestamp) / 86_400_000;
}
