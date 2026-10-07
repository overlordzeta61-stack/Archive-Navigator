import { describe, expect, it } from "vitest";
import type { FolderEntry, IndexEntry } from "../services/types";
import { buildPayload, gridPositions, parsePayload, payloadUuids, planFolderDrop } from "./drop";

const entry = (id: string, extra: Partial<IndexEntry> = {}): IndexEntry => ({
  uuid: `Actor.${id}`,
  id,
  name: id,
  searchName: id,
  documentName: "Actor",
  subtype: null,
  img: null,
  folderId: null,
  packId: null,
  ...extra,
});
const folder = (id: string, parentId: string | null, documentName = "Actor"): FolderEntry =>
  ({ id, name: id, parentId, documentName, sort: 0, color: null }) as FolderEntry;

describe("payload", () => {
  it("lit le format natif et rejette le reste", () => {
    expect(parsePayload('{"type":"Actor","uuid":"Actor.a"}')).toEqual({ type: "Actor", uuid: "Actor.a" });
    expect(parsePayload("pas du json")).toBeNull();
    expect(parsePayload('{"foo":1}')).toBeNull();
  });

  it("glisse la sélection si la ligne en fait partie, l'élément saisi en premier", () => {
    const [a, b, c] = [entry("a"), entry("b"), entry("c")];
    const p = buildPayload(b, [a, b]);
    expect(p.uuid).toBe("Actor.b");
    expect(payloadUuids(p)).toEqual(["Actor.b", "Actor.a"]);
    expect(buildPayload(c, [a, b])).toEqual({ type: "Actor", uuid: "Actor.c" });
  });
});

describe("planFolderDrop", () => {
  const entries = new Map(
    [
      entry("a"),
      entry("b", { folderId: "f1" }),
      entry("p", { packId: "dnd5e.monsters", uuid: "Compendium.dnd5e.monsters.Actor.p" }),
      entry("i", { documentName: "Item", uuid: "Item.i" }),
    ].map((e) => [e.uuid, e]),
  );
  const folders = [folder("f1", null), folder("f2", "f1"), folder("f3", null), folder("fi", null, "Item")];
  const plan = (uuids: string[], folderId: string | null) =>
    planFolderDrop(uuids, { folderId, documentName: "Actor" }, (u) => entries.get(u), folders);

  it("déplace le monde, importe le compendium, ignore les autres types", () => {
    const p = plan(["Actor.a", "Compendium.dnd5e.monsters.Actor.p", "Item.i"], "f1");
    expect(p.move.map((e) => e.id)).toEqual(["a"]);
    expect(p.import.map((e) => e.id)).toEqual(["p"]);
    expect(p.ignored).toBe(1);
  });

  it("ignore un élément déjà dans le dossier", () => {
    expect(plan(["Actor.b"], "f1").ignored).toBe(1);
  });

  it("rattache des dossiers sans créer de cycle", () => {
    expect(plan(["Folder.f3"], "f1").folders).toEqual(["f3"]);
    expect(plan(["Folder.f1"], "f2").folders).toEqual([]);
    expect(plan(["Folder.f1"], "f1").folders).toEqual([]);
    expect(plan(["Folder.fi"], "f1").folders).toEqual([]);
    expect(plan(["Folder.f2"], null).folders).toEqual(["f2"]);
  });
});

describe("gridPositions", () => {
  it("centre une grille presque carrée", () => {
    const pos = gridPositions(4, { x: 100, y: 100 }, 50);
    expect(pos).toEqual([
      { x: 50, y: 50 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
    ]);
    expect(gridPositions(5, { x: 0, y: 0 }, 10)).toHaveLength(5);
  });
});
