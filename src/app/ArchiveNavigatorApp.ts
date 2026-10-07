import { mount, unmount } from "svelte";
import { MODULE_ID } from "../constants";
import Navigator from "../ui/Navigator.svelte";

/**
 * Fenêtre ApplicationV2 dont le contenu est entièrement rendu par Svelte :
 * Foundry gère le cadre (déplacement, redimensionnement, réduction), Svelte
 * gère l'intérieur et sa réactivité.
 *
 * La classe est construite à la demande car `foundry.applications` n'est
 * garanti qu'une fois le moteur initialisé.
 */
function createAppClass() {
  const { ApplicationV2 } = foundry.applications.api;

  return class ArchiveNavigatorApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: MODULE_ID,
      classes: [MODULE_ID],
      tag: "div",
      window: {
        title: "ARCHIVE_NAVIGATOR.Title",
        icon: "fa-solid fa-box-archive",
        resizable: true,
      },
      position: { width: 1100, height: 720 },
    };

    #component: ReturnType<typeof mount> | null = null;

    async _renderHTML(): Promise<null> {
      return null;
    }

    _replaceHTML(_result: unknown, content: HTMLElement): void {
      if (!this.#component) this.#component = mount(Navigator, { target: content });
    }

    _onClose(options: unknown): void {
      if (this.#component) {
        unmount(this.#component);
        this.#component = null;
      }
      super._onClose(options);
    }
  };
}

let instance: any = null;

export function openNavigator(): void {
  if (!game.user?.isGM) {
    ui.notifications.warn(game.i18n.localize("ARCHIVE_NAVIGATOR.Errors.GMOnly"));
    return;
  }
  instance ??= new (createAppClass())();
  instance.render({ force: true });
  instance.bringToFront?.();
}
