import { MODULE_ID } from "../constants";

/** Traduit une clé du module (préfixe ARCHIVE_NAVIGATOR implicite). */
export function t(key: string, data?: Record<string, unknown>): string {
  const full = `ARCHIVE_NAVIGATOR.${key}`;
  return data ? game.i18n.format(full, data) : game.i18n.localize(full);
}

/** Libellé d'un type de document, tiré des métadonnées Foundry (« Acteurs », « Entrées de journal »…). */
export function documentLabel(documentName: string, plural = false): string {
  const metadata = CONFIG[documentName]?.documentClass?.metadata;
  const key = plural ? metadata?.labelPlural : metadata?.label;
  return game.i18n.localize(key ?? `DOCUMENT.${documentName}`);
}

export function subtypeLabel(documentName: string, subtype: string | null): string {
  if (!subtype) return "";
  const key = CONFIG[documentName]?.typeLabels?.[subtype];
  return key ? game.i18n.localize(key) : subtype;
}

export { MODULE_ID };
