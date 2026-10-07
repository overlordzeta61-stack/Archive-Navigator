<script lang="ts">
  import { DOCUMENT_ICONS, type DocumentType } from "../constants";
  import { trashService, type TrashBatch } from "../services/trash.svelte";
  import { documentLabel, t } from "../util/i18n";
  import type { TrashedSource } from "../util/trash";
  import Modal from "./Modal.svelte";

  let expanded = $state<string | null>(null);
  let contents = $state.raw<TrashedSource[]>([]);
  let picked = $state.raw<Set<string>>(new Set());
  let busy = $state(false);
  let purgeTarget = $state<TrashBatch[] | null>(null);

  async function toggle(batch: TrashBatch) {
    if (expanded === batch.id) {
      expanded = null;
      return;
    }
    expanded = batch.id;
    picked = new Set();
    contents = await trashService.contents(batch.id);
  }

  function pick(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    picked = next;
  }

  async function restore(batch: TrashBatch, ids?: string[]) {
    busy = true;
    try {
      const count = await trashService.restore(batch.id, ids);
      ui.notifications.info(t("Trash.Restored", { count }));
      if (expanded === batch.id) {
        picked = new Set();
        contents = await trashService.contents(batch.id);
        if (!contents.length) expanded = null;
      }
    } catch (error) {
      console.error(error);
      ui.notifications.error(t("Trash.RestoreFailed"));
    } finally {
      busy = false;
    }
  }

  async function purge() {
    if (!purgeTarget) return;
    busy = true;
    try {
      await trashService.purge(purgeTarget.map((b) => b.id));
      if (purgeTarget.some((b) => b.id === expanded)) expanded = null;
      purgeTarget = null;
    } finally {
      busy = false;
    }
  }

  function summary(batch: TrashBatch): string {
    return Object.entries(batch.counts)
      .map(([type, count]) => `${count} ${documentLabel(type, count! > 1).toLowerCase()}`)
      .join(", ");
  }
</script>

<section class="an-trash">
  <header>
    <h3><i class="fa-solid fa-trash-can"></i> {t("Trash.Title")}</h3>
    <button
      type="button"
      class="danger"
      disabled={!trashService.batches.length || busy}
      onclick={() => (purgeTarget = trashService.batches)}
    >
      <i class="fa-solid fa-dumpster-fire"></i>
      {t("Trash.Empty")}
    </button>
  </header>

  {#if !trashService.batches.length}
    <p class="an-status">{t("Trash.Nothing")}</p>
  {/if}

  <ul class="an-batches">
    {#each trashService.batches as batch (batch.id)}
      <li class="an-batch">
        <div class="an-batch-head">
          <button type="button" class="an-expand" onclick={() => toggle(batch)}>
            <i class="fa-solid {expanded === batch.id ? 'fa-caret-down' : 'fa-caret-right'}"></i>
            <span class="an-batch-date">{new Date(batch.deletedAt).toLocaleString()}</span>
            <span class="an-batch-summary">{summary(batch)}</span>
          </button>
          <button type="button" disabled={busy} onclick={() => restore(batch)} title={t("Trash.RestoreAll")}>
            <i class="fa-solid fa-trash-arrow-up"></i>
            {t("Trash.RestoreAll")}
          </button>
          <button
            type="button"
            class="danger"
            disabled={busy}
            onclick={() => (purgeTarget = [batch])}
            title={t("Trash.Purge")}
            aria-label={t("Trash.Purge")}
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        {#if expanded === batch.id}
          <ul class="an-batch-items">
            {#each contents as { documentName, data } (data._id)}
              <li>
                <label>
                  <input type="checkbox" checked={picked.has(data._id)} onchange={() => pick(data._id)} />
                  <i class={DOCUMENT_ICONS[documentName as DocumentType]}></i>
                  {data.name}
                </label>
              </li>
            {/each}
          </ul>
          <button
            type="button"
            disabled={busy || !picked.size}
            onclick={() => restore(batch, [...picked])}
          >
            <i class="fa-solid fa-trash-arrow-up"></i>
            {t("Trash.RestoreSelected", { count: picked.size })}
          </button>
        {/if}
      </li>
    {/each}
  </ul>
</section>

{#if purgeTarget}
  <Modal
    title={t("Trash.Purge")}
    confirmLabel={t("Trash.Purge")}
    confirmIcon="fa-solid fa-dumpster-fire"
    danger
    {busy}
    onconfirm={purge}
    oncancel={() => (purgeTarget = null)}
  >
    <p>
      {t("Trash.PurgeConfirm", {
        count: purgeTarget.reduce((sum, b) => sum + b.count, 0),
      })}
    </p>
  </Modal>
{/if}

<style>
  .an-trash {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  header h3 {
    margin: 0;
    border: none;
  }
  button {
    width: auto;
    padding: 0.15rem 0.5rem;
    line-height: 1.4;
    min-height: 0;
  }
  button.danger:not(:disabled) {
    border-color: var(--an-danger);
  }
  .an-batches,
  .an-batch-items {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .an-batch {
    border: 1px solid var(--an-border);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    margin-bottom: 0.35rem;
  }
  .an-batch-head {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .an-expand {
    flex: 1;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    background: none;
    border: none;
    color: inherit;
    text-align: left;
  }
  .an-batch-date {
    font-weight: bold;
  }
  .an-batch-summary {
    opacity: 0.75;
  }
  .an-batch-items {
    margin: 0.35rem 0 0.35rem 1.25rem;
    max-height: 240px;
    overflow-y: auto;
  }
  .an-batch-items label {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  .an-status {
    opacity: 0.7;
    text-align: center;
  }
</style>
