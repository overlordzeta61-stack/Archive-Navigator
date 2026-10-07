import { describe, expect, it } from "vitest";
import { matchScore, normalize } from "./search";

describe("normalize", () => {
  it("retire accents, casse et espaces superflus", () => {
    expect(normalize("  Épée   Longue ")).toBe("epee longue");
  });
});

describe("matchScore", () => {
  const score = (q: string, t: string) => matchScore(normalize(q), normalize(t));

  it("accepte une requête vide", () => {
    expect(score("", "Gobelin")).toBeGreaterThan(0);
  });

  it("classe égalité > préfixe > début de mot > sous-chaîne > sous-séquence", () => {
    const exact = score("gobelin", "Gobelin");
    const prefix = score("gob", "Gobelin archer");
    const word = score("arch", "Gobelin archer");
    const inner = score("bel", "Gobelin");
    const fuzzy = score("gbln", "Gobelin");
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(inner);
    expect(inner).toBeGreaterThan(fuzzy);
    expect(fuzzy).toBeGreaterThan(0);
  });

  it("ignore les accents", () => {
    expect(score("epee", "Épée longue")).toBeGreaterThan(0);
  });

  it("rejette ce qui ne correspond pas", () => {
    expect(score("dragon", "Gobelin")).toBe(0);
  });
});
