import { describe, expect, it } from "vitest";
import type { FolderEntry } from "../services/types";
import { flattenFolders } from "./folders";

const folder = (id: string, name: string, parentId: string | null, sort = 0): FolderEntry => ({
  id,
  name,
  parentId,
  sort,
  documentName: "Actor",
  color: null,
});

describe("flattenFolders", () => {
  it("parcourt en profondeur avec chemins et tri", () => {
    const flat = flattenFolders([
      folder("b", "Monstres", null, 2),
      folder("a", "PNJ", null, 1),
      folder("c", "Port-Brume", "a"),
    ]);
    expect(flat.map((f) => [f.path, f.depth])).toEqual([
      ["PNJ", 0],
      ["PNJ / Port-Brume", 1],
      ["Monstres", 0],
    ]);
  });

  it("garde les dossiers orphelins", () => {
    const flat = flattenFolders([folder("x", "Orphelin", "absent")]);
    expect(flat.map((f) => f.path)).toEqual(["Orphelin"]);
  });
});
