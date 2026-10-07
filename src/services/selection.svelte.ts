import { applyClick, type ClickMode } from "../util/selection";

/** Sélection courante (identifiants UUID), partagée par la liste et la barre d'actions. */
class SelectionStore {
  ids = $state.raw<Set<string>>(new Set());
  #anchor: string | null = null;

  click(ordered: readonly string[], uuid: string, mode: ClickMode): void {
    const next = applyClick({ selected: this.ids, anchor: this.#anchor }, ordered, uuid, mode);
    this.ids = next.selected;
    this.#anchor = next.anchor;
  }

  toggle(uuid: string): void {
    this.click([], uuid, "toggle");
  }

  set(uuids: Iterable<string>): void {
    this.ids = new Set(uuids);
  }

  clear(): void {
    this.ids = new Set();
    this.#anchor = null;
  }

  /** Retire les éléments qui n'existent plus (supprimés entre-temps). */
  prune(exists: (uuid: string) => boolean): void {
    if ([...this.ids].every(exists)) return;
    this.ids = new Set([...this.ids].filter(exists));
  }
}

export const selection = new SelectionStore();
