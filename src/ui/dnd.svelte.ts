/** État partagé du glisser-déposer : quelle cible du navigateur est survolée. */
export const dnd = $state({ over: null as string | null });

/** Petit badge « N éléments » affiché sous le curseur pendant le glisser. */
export function setDragBadge(event: DragEvent, label: string): void {
  if (!event.dataTransfer) return;
  const badge = document.createElement("div");
  badge.className = "archive-navigator-drag-badge";
  badge.textContent = label;
  document.body.append(badge);
  event.dataTransfer.setDragImage(badge, -12, -12);
  setTimeout(() => badge.remove());
}
