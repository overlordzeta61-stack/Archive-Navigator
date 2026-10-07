import { describe, expect, it } from "vitest";
import { applyClick, type SelectionState } from "./selection";

const ordered = ["a", "b", "c", "d", "e"];
const empty: SelectionState = { selected: new Set(), anchor: null };
const ids = (s: SelectionState) => [...s.selected].sort();

describe("applyClick", () => {
  it("single remplace la sélection", () => {
    const s = applyClick({ selected: new Set(["a", "b"]), anchor: "a" }, ordered, "c", "single");
    expect(ids(s)).toEqual(["c"]);
    expect(s.anchor).toBe("c");
  });

  it("toggle ajoute puis retire", () => {
    let s = applyClick(empty, ordered, "b", "toggle");
    s = applyClick(s, ordered, "d", "toggle");
    expect(ids(s)).toEqual(["b", "d"]);
    s = applyClick(s, ordered, "b", "toggle");
    expect(ids(s)).toEqual(["d"]);
  });

  it("range sélectionne la plage dans les deux sens et garde l'ancre", () => {
    let s = applyClick(empty, ordered, "b", "single");
    s = applyClick(s, ordered, "d", "range");
    expect(ids(s)).toEqual(["b", "c", "d"]);
    expect(s.anchor).toBe("b");
    s = applyClick({ selected: new Set(), anchor: "d" }, ordered, "a", "range");
    expect(ids(s)).toEqual(["a", "b", "c", "d"]);
  });

  it("range sans ancre visible ajoute simplement l'élément", () => {
    const s = applyClick({ selected: new Set(["z"]), anchor: "z" }, ordered, "c", "range");
    expect(ids(s)).toEqual(["c", "z"]);
  });
});
