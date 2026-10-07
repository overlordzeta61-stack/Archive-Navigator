<script lang="ts">
  import type { ActionAvailability } from "../actions/registry";
  import { availableActions } from "../actions/registry";
  import { DOCUMENT_ICONS, DOCUMENT_TYPES, type DocumentType } from "../constants";
  import { indexService } from "../services/index.svelte";
  import { selection } from "../services/selection.svelte";
  import { trashService } from "../services/trash.svelte";
  import type { IndexEntry, SourceScope } from "../services/types";
  import { documentLabel, subtypeLabel, t } from "../util/i18n";
  import { matchScore, normalize } from "../util/search";
  import { clickMode } from "../util/selection";
  import ActionBar from "./ActionBar.svelte";
  import ActionDialog from "./ActionDialog.svelte";
  import FolderTree from "./FolderTree.svelte";
  import Preview from "./Preview.svelte";
  import TrashView from "./TrashView.svelte";

  /** Au-delà, on demande d'affiner plutôt que d'afficher des milliers de lignes. */
  const MAX_ROWS = 500;

  let view = $state<"browse" | "trash">("browse");
  let documentName = $state<DocumentType>("Actor");
  let scope = $state<SourceScope>("world");
  let folderId = $state<string | null>(null);
  let query = $state("");
  let activeUuid = $state<string | null>(null);
  let pending = $state<ActionAvailability | null>(null);
  let listEl = $state<HTMLElement>();

  $effect(() => {
    if (scope !== "world") indexService.loadCompendia();
  });

  $effect(() => {
    trashService.refresh();
  });

  /** Tous les éléments connus, par UUID. */
  const byUuid = $derived(
    new Map([...indexService.world, ...indexService.compendia].map((e) => [e.uuid, e])),
  );

  // Les éléments supprimés (ou mis en corbeille) quittent la sélection.
  $effect(() => {
    const known = byUuid;
    selection.prune((uuid) => known.has(uuid));
  });

  const pool = $derived.by(() => {
    if (scope === "world") return indexService.world;
    if (scope === "compendia") return indexService.compendia;
    return [...indexService.world, ...indexService.compendia];
  });

  const counts = $derived.by(() => {
    const result = {} as Record<DocumentType, number>;
    for (const type of DOCUMENT_TYPES) result[type] = 0;
    for (const entry of pool) result[entry.documentName]++;
    return result;
  });

  const folders = $derived(indexService.folders.filter((f) => f.documentName === documentName));

  /** Le dossier choisi et tous ses sous-dossiers. */
  const folderScope = $derived.by(() => {
    if (!folderId) return null;
    const ids = new Set([folderId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of folders) {
        if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
          ids.add(f.id);
          grew = true;
        }
      }
    }
    return ids;
  });

  const results = $derived.by(() => {
    const q = normalize(query);
    const scored: { entry: IndexEntry; score: number }[] = [];
    for (const entry of pool) {
      if (entry.documentName !== documentName) continue;
      if (folderScope && !folderScope.has(entry.folderId ?? "")) continue;
      const score = matchScore(q, entry.searchName);
      if (score > 0) scored.push({ entry, score });
    }
    scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
    return scored.map((s) => s.entry);
  });

  const visible = $derived(results.slice(0, MAX_ROWS));
  const visibleUuids = $derived(visible.map((e) => e.uuid));

  const selectedEntries = $derived(
    [...selection.ids].map((uuid) => byUuid.get(uuid)).filter((e): e is IndexEntry => !!e),
  );
  const hiddenCount = $derived.by(() => {
    const shown = new Set(visibleUuids);
    return selectedEntries.filter((e) => !shown.has(e.uuid)).length;
  });
  const allVisibleSelected = $derived(
    visible.length > 0 && visible.every((e) => selection.ids.has(e.uuid)),
  );
  const someVisibleSelected = $derived(visible.some((e) => selection.ids.has(e.uuid)));

  const active = $derived(activeUuid ? (byUuid.get(activeUuid) ?? null) : null);

  function folderPath(entry: IndexEntry | null): string {
    if (!entry || entry.packId || !entry.folderId) return "";
    const names: string[] = [];
    let current = indexService.folders.find((f) => f.id === entry.folderId);
    while (current) {
      names.unshift(current.name);
      current = indexService.folders.find((f) => f.id === current!.parentId);
    }
    return names.join(" / ");
  }

  function selectType(type: DocumentType) {
    view = "browse";
    documentName = type;
    folderId = null;
    activeUuid = null;
  }

  function onRowClick(event: MouseEvent, entry: IndexEntry) {
    selection.click(visibleUuids, entry.uuid, clickMode(event));
    activeUuid = entry.uuid;
  }

  function toggleAllVisible() {
    const ids = new Set(selection.ids);
    if (allVisibleSelected) for (const uuid of visibleUuids) ids.delete(uuid);
    else for (const uuid of visibleUuids) ids.add(uuid);
    selection.set(ids);
  }

  function openTrashDialog() {
    const trash = availableActions(selectedEntries, game.user.isGM).find((a) => a.action.id === "trash");
    if (trash && !trash.reason) pending = trash;
  }

  function moveActive(delta: number, extend: boolean) {
    if (!visible.length) return;
    const index = activeUuid ? visibleUuids.indexOf(activeUuid) : -1;
    const next = visibleUuids[Math.min(visible.length - 1, Math.max(0, index + delta))];
    selection.click(visibleUuids, next, extend ? "range" : "single");
    activeUuid = next;
    listEl?.querySelector<HTMLElement>(`[data-uuid="${CSS.escape(next)}"]`)?.focus();
  }

  function onListKeydown(event: KeyboardEvent) {
    if (pending) return;
    const ctrl = event.ctrlKey || event.metaKey;
    if (ctrl && event.key.toLowerCase() === "a") {
      event.preventDefault();
      selection.set(new Set([...selection.ids, ...visibleUuids]));
    } else if (event.key === "Escape" && selection.ids.size) {
      event.preventDefault();
      event.stopPropagation();
      selection.clear();
    } else if (event.key === "Delete" && selection.ids.size) {
      event.preventDefault();
      openTrashDialog();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(event.key === "ArrowDown" ? 1 : -1, event.shiftKey);
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      openEntry(active);
    } else if (event.key === " " && active) {
      event.preventDefault();
      selection.toggle(active.uuid);
    }
  }

  function onDragStart(event: DragEvent, entry: IndexEntry) {
    // Format natif de Foundry : la ligne se dépose sur le canevas, une fiche ou un journal.
    event.dataTransfer?.setData(
      "text/plain",
      JSON.stringify({ type: entry.documentName, uuid: entry.uuid }),
    );
  }

  async function openEntry(entry: IndexEntry) {
    const doc = await fromUuid(entry.uuid);
    doc?.sheet?.render(true);
  }
</script>

<div class="an-navigator">
  <nav class="an-sidebar">
    <div class="an-scope">
      {#each ["world", "compendia", "all"] as const as value}
        <button
          type="button"
          class:active={scope === value && view === "browse"}
          onclick={() => {
            scope = value;
            folderId = null;
            view = "browse";
          }}
        >
          {t(`Source.${value === "world" ? "World" : value === "compendia" ? "Compendia" : "All"}`)}
        </button>
      {/each}
    </div>

    <ul class="an-types">
      {#each DOCUMENT_TYPES as type}
        <li>
          <button
            type="button"
            class:active={view === "browse" && documentName === type}
            onclick={() => selectType(type)}
          >
            <i class={DOCUMENT_ICONS[type]}></i>
            <span>{documentLabel(type, true)}</span>
            <span class="an-count">{counts[type]}</span>
          </button>
        </li>
      {/each}
      <li class="an-trash-link">
        <button type="button" class:active={view === "trash"} onclick={() => (view = "trash")}>
          <i class="fa-solid fa-trash-can"></i>
          <span>{t("Trash.Title")}</span>
          <span class="an-count">{trashService.batches.reduce((sum, b) => sum + b.count, 0)}</span>
        </button>
      </li>
    </ul>

    {#if view === "browse" && scope === "world" && folders.length}
      <div class="an-folders">
        <button
          type="button"
          class="an-all-folders"
          class:active={folderId === null}
          onclick={() => (folderId = null)}
        >
          <i class="fa-solid fa-folder-tree"></i>
          {t("Folders.All")}
        </button>
        <FolderTree {folders} parentId={null} selected={folderId} onselect={(id) => (folderId = id)} />
      </div>
    {/if}
  </nav>

  {#if view === "trash"}
    <TrashView />
  {:else}
    <section class="an-main">
      <div class="an-searchbar">
        <input
          type="checkbox"
          class="an-check"
          title={t("Selection.ToggleVisible")}
          checked={allVisibleSelected}
          indeterminate={someVisibleSelected && !allVisibleSelected}
          onchange={toggleAllVisible}
        />
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="search" placeholder={t("Search.Placeholder")} bind:value={query} />
        <span class="an-count">{t("Search.Count", { count: results.length })}</span>
      </div>

      {#if selectedEntries.length}
        <ActionBar
          entries={selectedEntries}
          {hiddenCount}
          onaction={(a) => (pending = a)}
          onclear={() => selection.clear()}
        />
      {/if}

      {#if scope !== "world" && indexService.compendiaStatus === "loading"}
        <p class="an-status"><i class="fa-solid fa-spinner fa-spin"></i> {t("Search.LoadingCompendia")}</p>
      {/if}

      <ul
        class="an-results"
        role="listbox"
        aria-multiselectable="true"
        tabindex="-1"
        bind:this={listEl}
        onkeydown={onListKeydown}
      >
        {#each visible as entry (entry.uuid)}
          {@const selected = selection.ids.has(entry.uuid)}
          <!-- svelte-ignore a11y_click_events_have_key_events (clavier géré par la liste) -->
          <li
            data-uuid={entry.uuid}
            class:active={entry.uuid === activeUuid}
            class:selected
            draggable="true"
            ondragstart={(e) => onDragStart(e, entry)}
            onclick={(e) => onRowClick(e, entry)}
            ondblclick={() => openEntry(entry)}
            tabindex="0"
            role="option"
            aria-selected={selected}
          >
            <input
              type="checkbox"
              class="an-check"
              checked={selected}
              tabindex="-1"
              onclick={(e) => {
                e.stopPropagation();
                selection.toggle(entry.uuid);
                activeUuid = entry.uuid;
              }}
            />
            <img src={entry.img || "icons/svg/mystery-man.svg"} alt="" loading="lazy" />
            <span class="an-name">{entry.name}</span>
            {#if entry.subtype}
              <span class="an-tag">{subtypeLabel(entry.documentName, entry.subtype)}</span>
            {/if}
            {#if entry.packId}
              <span class="an-tag an-pack" title={game.packs.get(entry.packId)?.title}>
                <i class="fa-solid fa-book-atlas"></i>
              </span>
            {/if}
          </li>
        {/each}
      </ul>
      {#if results.length > MAX_ROWS}
        <p class="an-status">{t("Search.Truncated", { count: MAX_ROWS })}</p>
      {/if}
    </section>
  {/if}

  <Preview entry={view === "browse" ? active : null} folderPath={folderPath(active)} />

  {#if pending}
    <ActionDialog
      availability={pending}
      selectedCount={selectedEntries.length}
      onclose={() => (pending = null)}
    />
  {/if}
</div>

<style>
  .an-navigator {
    position: relative;
    display: grid;
    grid-template-columns: 220px 1fr 260px;
    height: 100%;
    min-height: 0;
    gap: 0.5rem;
  }
  .an-sidebar,
  .an-main {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }
  .an-sidebar {
    border-right: 1px solid var(--an-border);
    padding-right: 0.5rem;
  }
  .an-scope {
    display: flex;
    gap: 2px;
    margin-bottom: 0.5rem;
  }
  .an-scope button {
    flex: 1;
    font-size: 0.8rem;
    padding: 0.2rem;
  }
  button.active {
    background: var(--an-accent-bg);
    border-color: var(--an-accent);
  }
  .an-types {
    list-style: none;
    margin: 0 0 0.5rem;
    padding: 0;
  }
  .an-trash-link {
    margin-top: 0.35rem;
    padding-top: 0.35rem;
    border-top: 1px solid var(--an-border);
  }
  .an-types button,
  .an-all-folders {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    text-align: left;
    background: none;
    border: 1px solid transparent;
    color: inherit;
    padding: 0.25rem 0.4rem;
  }
  .an-types button span:first-of-type {
    flex: 1;
  }
  .an-count {
    opacity: 0.6;
    font-size: 0.85em;
  }
  .an-folders {
    border-top: 1px solid var(--an-border);
    padding-top: 0.5rem;
  }
  .an-searchbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding-left: 0.4rem;
  }
  .an-searchbar input[type="search"] {
    flex: 1;
  }
  .an-check {
    flex: none;
    margin: 0;
  }
  .an-results {
    list-style: none;
    margin: 0;
    padding: 0;
    outline: none;
  }
  .an-results li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
  }
  .an-results li:hover {
    background: var(--an-hover-bg);
  }
  .an-results li.selected {
    background: var(--an-accent-bg);
  }
  .an-results li.active {
    outline: 1px solid var(--an-accent);
  }
  .an-results img {
    width: 32px;
    height: 32px;
    object-fit: cover;
    border: none;
    border-radius: 3px;
    flex: none;
  }
  .an-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .an-tag {
    font-size: 0.75em;
    padding: 0 0.4rem;
    border-radius: 8px;
    background: var(--an-hover-bg);
    white-space: nowrap;
  }
  .an-status {
    opacity: 0.7;
    text-align: center;
  }
</style>
