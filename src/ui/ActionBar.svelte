<script lang="ts">
  import { availableActions, type ActionAvailability } from "../actions/registry";
  import { DOCUMENT_ICONS, DOCUMENT_TYPES } from "../constants";
  import type { IndexEntry } from "../services/types";
  import { t } from "../util/i18n";

  interface Props {
    entries: IndexEntry[];
    /** Combien d'éléments sélectionnés sont masqués par les filtres actuels. */
    hiddenCount: number;
    onaction: (availability: ActionAvailability) => void;
    onclear: () => void;
  }

  let { entries, hiddenCount, onaction, onclear }: Props = $props();

  const availabilities = $derived(availableActions(entries, game.user.isGM));

  const breakdown = $derived(
    DOCUMENT_TYPES.map((type) => ({
      type,
      count: entries.filter((e) => e.documentName === type).length,
    })).filter((b) => b.count),
  );
</script>

<div class="an-actionbar">
  <span class="an-selection-count">
    {t("Selection.Count", { count: entries.length })}
    {#each breakdown as { type, count }}
      <span class="an-breakdown"><i class={DOCUMENT_ICONS[type]}></i> {count}</span>
    {/each}
    {#if hiddenCount}
      <span class="an-hidden" title={t("Selection.HiddenHint")}>
        ({t("Selection.Hidden", { count: hiddenCount })})
      </span>
    {/if}
  </span>
  <div class="an-actions">
    {#each availabilities as availability (availability.action.id)}
      {@const { action, applicable, reason } = availability}
      <button
        type="button"
        class:danger={action.destructive}
        disabled={!!reason}
        title={reason ? t(reason) : t(`Actions.${action.label}`)}
        onclick={() => onaction(availability)}
      >
        <i class={action.icon}></i>
        {t(`Actions.${action.label}`)}
        {#if !reason && applicable.length !== entries.length}
          <span class="an-partial">({applicable.length})</span>
        {/if}
      </button>
    {/each}
    <button type="button" class="an-clear" title={t("Selection.Clear")} onclick={onclear}>
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
</div>

<style>
  .an-actionbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    margin-bottom: 0.5rem;
    border: 1px solid var(--an-accent);
    background: var(--an-accent-bg);
    border-radius: 4px;
  }
  .an-selection-count {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: bold;
  }
  .an-breakdown,
  .an-hidden {
    font-weight: normal;
    opacity: 0.8;
  }
  .an-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-left: auto;
  }
  .an-actions button {
    width: auto;
    padding: 0.15rem 0.5rem;
    line-height: 1.4;
    min-height: 0;
  }
  button.danger:not(:disabled) {
    border-color: var(--an-danger);
  }
  .an-partial {
    opacity: 0.7;
  }
</style>
