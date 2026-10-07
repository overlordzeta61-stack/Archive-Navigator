<script lang="ts">
  import type { FolderEntry } from "../services/types";
  import { dnd } from "./dnd.svelte";
  import FolderTree from "./FolderTree.svelte";

  interface Props {
    folders: FolderEntry[];
    parentId: string | null;
    selected: string | null;
    onselect: (id: string) => void;
    ondropfolder: (folderId: string, event: DragEvent) => void;
  }

  let { folders, parentId, selected, onselect, ondropfolder }: Props = $props();

  /** Délai de survol avant de déplier un dossier pendant un glisser. */
  const EXPAND_DELAY = 600;

  const children = $derived(
    folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)),
  );

  let expanded = $state<Record<string, boolean>>({});
  let expandTimer: ReturnType<typeof setTimeout> | null = null;

  function onDragStart(event: DragEvent, folder: FolderEntry) {
    event.stopPropagation();
    event.dataTransfer?.setData(
      "text/plain",
      JSON.stringify({ type: "Folder", uuid: `Folder.${folder.id}` }),
    );
  }

  function onDragOver(event: DragEvent, folder: FolderEntry, hasChildren: boolean) {
    event.preventDefault();
    if (dnd.over !== folder.id) {
      dnd.over = folder.id;
      if (expandTimer) clearTimeout(expandTimer);
      expandTimer = hasChildren && !expanded[folder.id]
        ? setTimeout(() => (expanded[folder.id] = true), EXPAND_DELAY)
        : null;
    }
  }

  function onDragLeave(folder: FolderEntry) {
    if (dnd.over === folder.id) dnd.over = null;
    if (expandTimer) clearTimeout(expandTimer);
    expandTimer = null;
  }

  function onDrop(event: DragEvent, folder: FolderEntry) {
    event.preventDefault();
    event.stopPropagation();
    onDragLeave(folder);
    ondropfolder(folder.id, event);
  }
</script>

{#if children.length}
  <ul class="an-folder-tree">
    {#each children as folder (folder.id)}
      {@const hasChildren = folders.some((f) => f.parentId === folder.id)}
      <li>
        <div
          class="an-folder"
          class:selected={selected === folder.id}
          class:drop-target={dnd.over === folder.id}
          role="treeitem"
          aria-selected={selected === folder.id}
          tabindex="-1"
          draggable="true"
          ondragstart={(e) => onDragStart(e, folder)}
          ondragover={(e) => onDragOver(e, folder, hasChildren)}
          ondragleave={() => onDragLeave(folder)}
          ondrop={(e) => onDrop(e, folder)}
        >
          <button
            type="button"
            class="an-toggle"
            class:hidden={!hasChildren}
            aria-label="toggle"
            onclick={() => (expanded[folder.id] = !expanded[folder.id])}
          >
            <i class="fa-solid {expanded[folder.id] ? 'fa-caret-down' : 'fa-caret-right'}"></i>
          </button>
          <button type="button" class="an-folder-name" onclick={() => onselect(folder.id)}>
            <i class="fa-solid fa-folder" style:color={folder.color}></i>
            {folder.name}
          </button>
        </div>
        {#if expanded[folder.id]}
          <FolderTree {folders} parentId={folder.id} {selected} {onselect} {ondropfolder} />
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .an-folder-tree {
    list-style: none;
    margin: 0;
    padding: 0 0 0 0.75rem;
  }
  .an-folder {
    display: flex;
    align-items: center;
    border-radius: 4px;
    border: 1px dashed transparent;
  }
  .an-folder.selected {
    background: var(--an-accent-bg);
  }
  .an-folder.drop-target {
    border-color: var(--an-accent);
    background: var(--an-accent-bg);
  }
  .an-toggle,
  .an-folder-name {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0.15rem 0.25rem;
    line-height: 1.4;
    min-height: 0;
    width: auto;
  }
  .an-toggle.hidden {
    visibility: hidden;
  }
  .an-folder-name {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
