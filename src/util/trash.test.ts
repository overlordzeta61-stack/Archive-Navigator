import { describe, expect, it } from "vitest";
import { ageInDays, fromAdventureContent, prepareRestore, toAdventureContent } from "./trash";

describe("contenu d'Adventure", () => {
  it("fait l'aller-retour en conservant les types", () => {
    const sources = [
      { documentName: "Actor" as const, data: { _id: "a1", name: "Aldric" } },
      { documentName: "JournalEntry" as const, data: { _id: "j1", name: "Taverne" } },
      { documentName: "Actor" as const, data: { _id: "a2", name: "Gobelin" } },
    ];
    const content = toAdventureContent(sources);
    expect(content.actors.map((d) => d._id)).toEqual(["a1", "a2"]);
    expect(content.journal.map((d) => d._id)).toEqual(["j1"]);
    expect(content.items).toEqual([]);
    expect(fromAdventureContent(content)).toHaveLength(3);
  });
});

describe("prepareRestore", () => {
  it("garde l'identifiant et le dossier quand c'est possible", () => {
    const r = prepareRestore({ _id: "a1", folder: "f1" }, () => true, () => false);
    expect(r).toEqual({ data: { _id: "a1", folder: "f1" }, keepId: true });
  });

  it("retire un dossier disparu et un identifiant déjà pris", () => {
    const original = { _id: "a1", folder: "f1" };
    const r = prepareRestore(original, () => false, () => true);
    expect(r.keepId).toBe(false);
    expect(r.data).toEqual({ folder: null });
    expect(original).toEqual({ _id: "a1", folder: "f1" });
  });
});

describe("ageInDays", () => {
  it("calcule l'âge", () => {
    expect(ageInDays(0, 2 * 86_400_000)).toBe(2);
  });
});
