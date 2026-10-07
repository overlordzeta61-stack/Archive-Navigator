<script lang="ts">
  import type { ActionAvailability, ActionParams } from "../actions/registry";
  import { DOCUMENT_ICONS } from "../constants";
  import { indexService } from "../services/index.svelte";
  import { findUsage } from "../services/references";
  import { documentLabel, t } from "../util/i18n";
  import { flattenFolders } from "../util/folders";
  import { normalize } from "../util/search";
  import Modal from "./Modal.svelte";

  interface Props {
    availability: ActionAvailability;
    /** Nombre d'éléments sélectionnés, y compris ceux que l'action ignore. */
    selectedCount: number;
    onclose: () => void;
  }

  let { availability, selectedCount, onclose }: Props = $props();

  const action = $derived(availability.action);
  const entries = $derived(availability.applicable);
  const skipped = $derived(selectedCount - entries.length);

  let busy = $state(false);
  let folderId = $state<string | null>(null);
  let folderFilter = $state("");
  let ownership = $state(0);

  const usage = $derived(action.dialog === "confirm-trash" ? findUsage(entries) : new Map());
  const warned = $derived(entries.filter((e) => usage.has(e.uuid)));

  const folderOptions = $derived.by(() => {
    if (action.dialog !== "folder") return [];
    const type = entries[0]?.documentName;
    const flat = flattenFolders(indexService.folders.filter((f) => f.documentName === type));
    const q = normalize(folderFilter);
    return q ? flat.filter((f) => normalize(f.path).includes(q)) : flat;
  });

  const ownershipLevels = $derived(
    Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS as Record<string, number>).filter(
      ([, level]) => level >= 0,
    ),
  );

  async function confirm() {
    busy = true;
    const params: ActionParams = { folderId, ownership };
    try {
      const count = await action.run(entries, params);
      ui.notifications.info(t("Actions.Done", { action: t(`Actions.${action.label}`), count }));
      onclose();
    } catch (error) {
      console.error(error);
      ui.notifications.error(t("Actions.Failed", { action: t(`Actions.${action.label}`) }));
      busy = false;
    }
  }
</script>

<Modal
  title={t(`Actions.${action.label}`)}
  confirmLabel={t(`Actions.${action.label}`)}
  confirmIcon={action.icon}
  danger={action.destructive}
  {busy}
  onconfirm={confirm}
  oncancel={onclose}
>
  <p>{t("Dialog.Affected", { count: entries.length })}</p>
  {#if skipped > 0}
    <p class="an-note"><i class="fa-solid fa-circle-info"></i> {t("Dialog.Skipped", { count: skipped })}</p>
  {/if}

  {#if action.dialog === "confirm-trash"}
    {#if warned.length}
      <div class="an-warning">
        <p><i class="fa-solid fa-triangle-exclamation"></i> {t("Dialog.UsageWarning")}</p>
        <ul>
          {#each warned as entry (entry.uuid)}
            <li><strong>{entry.name}</strong> : {usage.get(entry.uuid)?.join(", ")}</li>
          {/each}
        </ul>
      </div>
    {/if}
    <ul class="an-dialog-list">
      {#each entries as entry (entry.uuid)}
        <li><i class={DOCUMENT_ICONS[entry.documentName]}></i> {entry.name}</li>
      {/each}
    </ul>
    <p class="an-note"><i class="fa-solid fa-trash-arrow-up"></i> {t("Dialog.TrashHint")}</p>
  {:else if action.dialog === "folder"}
    <p>{t("Dialog.ChooseFolder", { type: documentLabel(entries[0].documentName, true) })}</p>
    <input type="search" placeholder={t("Dialog.FilterFolders")} bind:value={folderFilter} />
    <ul class="an-dialog-list an-folder-picker">
      <li>
        <label><input type="radio" bind:group={folderId} value={null} /> <em>{t("Dialog.Root")}</em></label>
      </li>
      {#each folderOptions as option (option.folder.id)}
        <li style:padding-left="{folderFilter ? 0 : option.depth}rem">
          <label title={option.path}>
            <input type="radio" bind:group={folderId} value={option.folder.id} />
            <i class="fa-solid fa-folder" style:color={option.folder.color}></i>
            {folderFilter ? option.path : option.folder.name}
          </label>
        </li>
      {/each}
    </ul>
  {:else if action.dialog === "ownership"}
    <label class="an-field">
      {t("Dialog.DefaultOwnership")}
      <select bind:value={ownership}>
        {#each ownershipLevels as [key, level]}
          <option value={level}>{game.i18n.localize(`OWNERSHIP.${key}`)}</option>
        {/each}
      </select>
    </label>
  {/if}
</Modal>

<style>
  .an-dialog-list {
    list-style: none;
    margin: 0.5rem 0;
    padding: 0.25rem;
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid var(--an-border);
    border-radius: 4px;
  }
  .an-dialog-list li {
    padding: 0.1rem 0.25rem;
  }
  .an-folder-picker label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
  }
  .an-warning {
    border: 1px solid var(--an-danger);
    background: var(--an-danger-bg);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
  }
  .an-warning p {
    margin: 0.25rem 0;
  }
  .an-warning ul {
    margin: 0;
    padding-left: 1.25rem;
    max-height: 120px;
    overflow-y: auto;
  }
  .an-note {
    opacity: 0.8;
    font-size: 0.9em;
  }
  .an-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
</style>
