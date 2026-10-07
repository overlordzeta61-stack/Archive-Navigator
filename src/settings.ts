import { MODULE_ID } from "./constants";

export const SETTINGS = {
  trashRetentionDays: "trashRetentionDays",
} as const;

export function registerSettings(): void {
  game.settings.register(MODULE_ID, SETTINGS.trashRetentionDays, {
    name: "ARCHIVE_NAVIGATOR.Settings.TrashRetention.Name",
    hint: "ARCHIVE_NAVIGATOR.Settings.TrashRetention.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 30,
    range: { min: 0, max: 365, step: 1 },
  });
}

export function getSetting<T>(key: string): T {
  return game.settings.get(MODULE_ID, key) as T;
}
