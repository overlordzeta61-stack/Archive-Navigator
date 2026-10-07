import type { DocumentType } from "../constants";

/** Entrée légère de l'index, commune aux documents du monde et des compendiums. */
export interface IndexEntry {
  uuid: string;
  id: string;
  name: string;
  /** Nom normalisé, précalculé pour la recherche. */
  searchName: string;
  documentName: DocumentType;
  /** Sous-type système (« npc », « spell »…), s'il existe. */
  subtype: string | null;
  img: string | null;
  folderId: string | null;
  /** Identifiant du compendium, ou null pour un document du monde. */
  packId: string | null;
}

export interface FolderEntry {
  id: string;
  name: string;
  documentName: DocumentType;
  parentId: string | null;
  color: string | null;
  sort: number;
}

export type SourceScope = "world" | "compendia" | "all";
