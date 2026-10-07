<script lang="ts">
  import type { Snippet } from "svelte";
  import { t } from "../util/i18n";

  interface Props {
    title: string;
    confirmLabel: string;
    confirmIcon?: string;
    danger?: boolean;
    busy?: boolean;
    disabled?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
    children: Snippet;
  }

  let {
    title,
    confirmLabel,
    confirmIcon = "fa-solid fa-check",
    danger = false,
    busy = false,
    disabled = false,
    onconfirm,
    oncancel,
    children,
  }: Props = $props();

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && !busy) {
      event.stopPropagation();
      oncancel();
    }
  }
</script>

<!-- Fond modal limité à la fenêtre du navigateur, pas à tout Foundry. -->
<div class="an-modal-backdrop" role="presentation" {onkeydown}>
  <div class="an-modal" role="dialog" aria-modal="true" aria-label={title}>
    <header><h3>{title}</h3></header>
    <div class="an-modal-body">
      {@render children()}
    </div>
    <footer>
      <button type="button" onclick={oncancel} disabled={busy}>
        <i class="fa-solid fa-xmark"></i>
        {t("Dialog.Cancel")}
      </button>
      <button type="button" class:danger onclick={onconfirm} disabled={busy || disabled}>
        <i class={busy ? "fa-solid fa-spinner fa-spin" : confirmIcon}></i>
        {confirmLabel}
      </button>
    </footer>
  </div>
</div>

<style>
  .an-modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .an-modal {
    background: var(--an-modal-bg);
    border: 1px solid var(--an-border);
    border-radius: 6px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
    width: min(560px, 90%);
    max-height: 85%;
    display: flex;
    flex-direction: column;
  }
  header,
  footer {
    padding: 0.5rem 0.75rem;
  }
  header h3 {
    margin: 0;
    border: none;
  }
  .an-modal-body {
    padding: 0 0.75rem;
    overflow-y: auto;
    min-height: 0;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    border-top: 1px solid var(--an-border);
  }
  footer button {
    width: auto;
  }
  button.danger {
    background: var(--an-danger-bg);
    border-color: var(--an-danger);
  }
</style>
