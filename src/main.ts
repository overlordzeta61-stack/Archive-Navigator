import "./styles/base.css";
import { getActions, registerAction } from "./actions/registry";
import { registerBuiltinActions } from "./actions/builtin";
import { openNavigator } from "./app/ArchiveNavigatorApp";
import { MODULE_ID } from "./constants";
import { indexService } from "./services/index.svelte";
import { trashService } from "./services/trash.svelte";
import { registerSettings } from "./settings";

Hooks.once("init", () => {
  registerSettings();
  registerBuiltinActions();

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
  if (module) module.api = {
    open: openNavigator,
    index: indexService,
    trash: trashService,
    registerAction,
    getActions,
  };
});

Hooks.once("ready", () => {
  if (!game.user.isGM) return;
  indexService.start();
  trashService.purgeExpired().catch((error) => console.error(error));
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
