<script lang="ts">
  import type { FolderEntry } from "../services/types";
  import FolderTree from "./FolderTree.svelte";

  interface Props {
    folders: FolderEntry[];
    parentId: string | null;
    selected: string | null;
    onselect: (id: string) => void;
  }

  let { folders, parentId, selected, onselect }: Props = $props();

  const children = $derived(
    folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)),
  );

  let expanded = $state<Record<string, boolean>>({});
</script>

{#if children.length}
  <ul class="an-folder-tree">
    {#each children as folder (folder.id)}
      {@const hasChildren = folders.some((f) => f.parentId === folder.id)}
      <li>
        <div class="an-folder" class:selected={selected === folder.id}>
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
          <FolderTree {folders} parentId={folder.id} {selected} {onselect} />
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
  }
  .an-folder.selected {
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
