export type ClickMode = "single" | "toggle" | "range";

export interface SelectionState {
  selected: Set<string>;
  anchor: string | null;
}

/**
 * Applique un clic à une sélection, comme un explorateur de fichiers :
 * - single : ne garder que l'élément cliqué ;
 * - toggle (Ctrl/Cmd) : ajouter ou retirer l'élément ;
 * - range (Maj) : ajouter la plage entre l'ancre et l'élément, dans l'ordre affiché.
 */
export function applyClick(
  state: SelectionState,
  ordered: readonly string[],
  id: string,
  mode: ClickMode,
): SelectionState {
  if (mode === "single") return { selected: new Set([id]), anchor: id };

  if (mode === "toggle") {
    const selected = new Set(state.selected);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    return { selected, anchor: id };
  }

  const from = state.anchor ? ordered.indexOf(state.anchor) : -1;
  const to = ordered.indexOf(id);
  if (from === -1 || to === -1) return { selected: new Set([...state.selected, id]), anchor: id };
  const [start, end] = from < to ? [from, to] : [to, from];
  const selected = new Set(state.selected);
  for (let i = start; i <= end; i++) selected.add(ordered[i]);
  // L'ancre ne bouge pas : Maj+clic successifs étendent depuis le même point.
  return { selected, anchor: state.anchor };
}

export function clickMode(event: MouseEvent | KeyboardEvent): ClickMode {
  if (event.shiftKey) return "range";
  if (event.ctrlKey || event.metaKey) return "toggle";
  return "single";
}
