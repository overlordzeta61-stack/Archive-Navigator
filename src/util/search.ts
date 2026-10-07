/**
 * Normalise une chaîne pour la recherche : minuscules, sans accents,
 * espaces compactés. « Épée  Longue » → « epee longue ».
 */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score de correspondance floue entre une requête et un texte, tous deux
 * déjà normalisés. Retourne 0 si aucun rapport, sinon un score d'autant plus
 * élevé que la correspondance est directe :
 * égalité > préfixe > début de mot > sous-chaîne > sous-séquence.
 */
export function matchScore(query: string, text: string): number {
  if (!query) return 1;
  if (text === query) return 1000;
  if (text.startsWith(query)) return 800 - text.length;
  const index = text.indexOf(query);
  if (index > 0) {
    const wordStart = text[index - 1] === " ";
    return (wordStart ? 600 : 400) - index;
  }
  return subsequenceScore(query, text);
}

/** Tous les caractères de la requête apparaissent dans l'ordre ; les trous pénalisent. */
function subsequenceScore(query: string, text: string): number {
  let ti = 0;
  let gaps = 0;
  for (const char of query) {
    const found = text.indexOf(char, ti);
    if (found === -1) return 0;
    gaps += found - ti;
    ti = found + 1;
  }
  return Math.max(1, 200 - gaps * 5);
}
