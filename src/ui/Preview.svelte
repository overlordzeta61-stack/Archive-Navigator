<script lang="ts">
  import type { IndexEntry } from "../services/types";
  import { documentLabel, subtypeLabel, t } from "../util/i18n";

  interface Props {
    entry: IndexEntry | null;
    folderPath: string;
  }

  let { entry, folderPath }: Props = $props();

  const source = $derived(
    entry?.packId ? (game.packs.get(entry.packId)?.title ?? entry.packId) : t("Source.World"),
  );

  async function open() {
    if (!entry) return;
    const doc = await fromUuid(entry.uuid);
    doc?.sheet?.render(true);
  }

  async function viewScene() {
    if (!entry) return;
    const doc = await fromUuid(entry.uuid);
    doc?.view?.();
  }
</script>

<aside class="an-preview">
  {#if entry}
    {#if entry.img}
      <img src={entry.img} alt={entry.name} />
    {/if}
    <h3>{entry.name}</h3>
    <dl>
      <dt>{t("Preview.Type")}</dt>
      <dd>
        {documentLabel(entry.documentName)}{entry.subtype
          ? ` · ${subtypeLabel(entry.documentName, entry.subtype)}`
          : ""}
      </dd>
      <dt>{t("Preview.Source")}</dt>
      <dd>{source}</dd>
      {#if folderPath}
        <dt>{t("Preview.Folder")}</dt>
        <dd>{folderPath}</dd>
      {/if}
    </dl>
    <div class="an-preview-actions">
      <button type="button" onclick={open}>
        <i class="fa-solid fa-up-right-from-square"></i>
        {t("Preview.Open")}
      </button>
      {#if entry.documentName === "Scene" && !entry.packId}
        <button type="button" onclick={viewScene}>
          <i class="fa-solid fa-eye"></i>
          {t("Preview.View")}
        </button>
      {/if}
    </div>
  {:else}
    <p class="an-empty">{t("Preview.Empty")}</p>
  {/if}
</aside>

<style>
  .an-preview {
    padding: 0.5rem;
    overflow-y: auto;
  }
  img {
    display: block;
    width: 100%;
    max-height: 220px;
    object-fit: contain;
    border: none;
    margin-bottom: 0.5rem;
  }
  h3 {
    margin: 0 0 0.5rem;
    border: none;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.5rem;
    margin: 0 0 0.75rem;
  }
  dt {
    font-weight: bold;
    opacity: 0.8;
  }
  dd {
    margin: 0;
  }
  .an-preview-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .an-empty {
    opacity: 0.6;
    text-align: center;
    margin-top: 2rem;
  }
</style>
