import type { FolderEntry } from "../services/types";

export interface FlatFolder {
  folder: FolderEntry;
  depth: number;
  path: string;
}

/** Aplatit l'arborescence dans l'ordre d'affichage, avec profondeur et chemin complet. */
export function flattenFolders(folders: readonly FolderEntry[]): FlatFolder[] {
  const byParent = new Map<string | null, FolderEntry[]>();
  for (const f of folders) {
    const siblings = byParent.get(f.parentId) ?? [];
    siblings.push(f);
    byParent.set(f.parentId, siblings);
  }
  const ids = new Set(folders.map((f) => f.id));
  const result: FlatFolder[] = [];
  const visit = (parentId: string | null, depth: number, prefix: string) => {
    const children = (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
    for (const folder of children) {
      const path = prefix ? `${prefix} / ${folder.name}` : folder.name;
      result.push({ folder, depth, path });
      visit(folder.id, depth + 1, path);
    }
  };
  visit(null, 0, "");
  // Dossiers dont le parent est introuvable : affichés à la racine plutôt que perdus.
  for (const f of folders) {
    if (f.parentId && !ids.has(f.parentId)) {
      result.push({ folder: f, depth: 0, path: f.name });
      visit(f.id, 1, f.name);
    }
  }
  return result;
}
