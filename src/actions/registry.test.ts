import { describe, expect, it } from "vitest";
import type { IndexEntry } from "../services/types";
import { availableActions, registerAction } from "./registry";

const entry = (uuid: string, packId: string | null = null): IndexEntry => ({
  uuid,
  id: uuid,
  name: uuid,
  searchName: uuid,
  documentName: "Actor",
  subtype: null,
  img: null,
  folderId: null,
  packId,
});

registerAction({
  id: "world-only",
  label: "x",
  icon: "",
  gmOnly: true,
  dialog: "confirm",
  appliesTo: (e) => !e.packId,
  run: async (e) => e.length,
});

describe("availableActions", () => {
  it("ne retient que les éléments compatibles", () => {
    const [a] = availableActions([entry("a"), entry("b", "pack")], true);
    expect(a.applicable.map((e) => e.uuid)).toEqual(["a"]);
    expect(a.reason).toBeNull();
  });

  it("explique quand rien ne s'applique", () => {
    const [a] = availableActions([entry("b", "pack")], true);
    expect(a.reason).toBe("Actions.NotApplicable");
  });

  it("masque les actions MJ aux joueurs", () => {
    expect(availableActions([entry("a")], false)).toEqual([]);
  });
});
