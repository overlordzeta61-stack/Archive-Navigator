export const MODULE_ID = "archive-navigator";

/** Types de documents primaires gérés par le navigateur, dans l'ordre d'affichage. */
export const DOCUMENT_TYPES = [
  "Actor",
  "Item",
  "JournalEntry",
  "Scene",
  "RollTable",
  "Macro",
  "Playlist",
  "Cards",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_ICONS: Record<DocumentType, string> = {
  Actor: "fa-solid fa-user",
  Item: "fa-solid fa-suitcase",
  JournalEntry: "fa-solid fa-book-open",
  Scene: "fa-solid fa-map",
  RollTable: "fa-solid fa-table-list",
  Macro: "fa-solid fa-code",
  Playlist: "fa-solid fa-music",
  Cards: "fa-solid fa-cards",
};

/** Nom de la collection du monde (game.<collection>) pour chaque type. */
export const WORLD_COLLECTIONS: Record<DocumentType, string> = {
  Actor: "actors",
  Item: "items",
  JournalEntry: "journal",
  Scene: "scenes",
  RollTable: "tables",
  Macro: "macros",
  Playlist: "playlists",
  Cards: "cards",
};
