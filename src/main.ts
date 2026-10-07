import "./styles/base.css";
import { openNavigator } from "./app/ArchiveNavigatorApp";
import { MODULE_ID } from "./constants";
import { indexService } from "./services/index.svelte";

Hooks.once("init", () => {
  game.keybindings.register(MODULE_ID, "open", {
    name: "ARCHIVE_NAVIGATOR.Keybindings.Open",
    editable: [{ key: "KeyA", modifiers: ["Control", "Shift"] }],
    restricted: true,
    onDown: () => {
      openNavigator();
      return true;
    },
  });

  const module = game.modules.get(MODULE_ID);
  if (module) module.api = { open: openNavigator, index: indexService };
});

Hooks.once("ready", () => {
  if (game.user.isGM) indexService.start();
});

// Bouton d'accès dans l'en-tête de chaque onglet de la barre latérale.
Hooks.on("renderDocumentDirectory", (_app: unknown, html: HTMLElement) => {
  if (!game.user.isGM || !(html instanceof HTMLElement)) return;
  const actions = html.querySelector(".header-actions");
  if (!actions || actions.querySelector(".archive-navigator-open")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "archive-navigator-open";
  button.innerHTML = `<i class="fa-solid fa-box-archive"></i> ${game.i18n.localize("ARCHIVE_NAVIGATOR.Title")}`;
  button.addEventListener("click", openNavigator);
  actions.append(button);
});
