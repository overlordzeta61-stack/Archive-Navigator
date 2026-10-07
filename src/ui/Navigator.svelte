<script lang="ts">
  import { DOCUMENT_ICONS, DOCUMENT_TYPES, type DocumentType } from "../constants";
  import { indexService } from "../services/index.svelte";
  import type { IndexEntry, SourceScope } from "../services/types";
  import { documentLabel, subtypeLabel, t } from "../util/i18n";
  import { matchScore, normalize } from "../util/search";
  import FolderTree from "./FolderTree.svelte";
  import Preview from "./Preview.svelte";

  /** Au-delà, on demande d'affiner plutôt que d'afficher des milliers de lignes. */
  const MAX_ROWS = 500;

  let documentName = $state<DocumentType>("Actor");
  let scope = $state<SourceScope>("world");
  let folderId = $state<string | null>(null);
  let query = $state("");
  let activeUuid = $state<string | null>(null);

  $effect(() => {
    if (scope !== "world") indexService.loadCompendia();
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

  const active = $derived(results.find((e) => e.uuid === activeUuid) ?? null);

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
    documentName = type;
    folderId = null;
    activeUuid = null;
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
          class:active={scope === value}
          onclick={() => {
            scope = value;
            folderId = null;
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
            class:active={documentName === type}
            onclick={() => selectType(type)}
          >
            <i class={DOCUMENT_ICONS[type]}></i>
            <span>{documentLabel(type, true)}</span>
            <span class="an-count">{counts[type]}</span>
          </button>
        </li>
      {/each}
    </ul>

    {#if scope === "world" && folders.length}
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

  <section class="an-main">
    <div class="an-searchbar">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="search" placeholder={t("Search.Placeholder")} bind:value={query} />
      <span class="an-count">{t("Search.Count", { count: results.length })}</span>
    </div>

    {#if scope !== "world" && indexService.compendiaStatus === "loading"}
      <p class="an-status"><i class="fa-solid fa-spinner fa-spin"></i> {t("Search.LoadingCompendia")}</p>
    {/if}

    <ul class="an-results">
      {#each results.slice(0, MAX_ROWS) as entry (entry.uuid)}
        <li
          class:active={entry.uuid === activeUuid}
          draggable="true"
          ondragstart={(e) => onDragStart(e, entry)}
          onclick={() => (activeUuid = entry.uuid)}
          ondblclick={() => openEntry(entry)}
          onkeydown={(e) => e.key === "Enter" && openEntry(entry)}
          tabindex="0"
          role="option"
          aria-selected={entry.uuid === activeUuid}
        >
          <img src={entry.img || "icons/svg/mystery-man.svg"} alt="" loading="lazy" />
          <span class="an-name">{entry.name}</span>
          {#if entry.subtype}
            <span class="an-tag">{subtypeLabel(entry.documentName, entry.subtype)}</span>
          {/if}
          {#if entry.packId}
            <span class="an-tag an-pack"><i class="fa-solid fa-book-atlas"></i></span>
          {/if}
        </li>
      {/each}
    </ul>
    {#if results.length > MAX_ROWS}
      <p class="an-status">{t("Search.Truncated", { count: MAX_ROWS })}</p>
    {/if}
  </section>

  <Preview entry={active} folderPath={folderPath(active)} />
</div>

<style>
  .an-navigator {
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
  }
  .an-searchbar input {
    flex: 1;
  }
  .an-results {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .an-results li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .an-results li:hover {
    background: var(--an-hover-bg);
  }
  .an-results li.active {
    background: var(--an-accent-bg);
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
