# Archive Navigator

Module Foundry VTT (v14) : une fenêtre unifiée pour que le MJ parcoure,
recherche et gère en masse le contenu du monde (acteurs, objets, journaux,
scènes, tables, macros, playlists, cartes).

La conception complète et la feuille de route sont dans
[docs/DESIGN.md](docs/DESIGN.md).

## Fonctionnalités actuelles
- Navigation par type et par dossier (sous-dossiers inclus).
- Portée : monde, compendiums (lecture seule) ou les deux.
- Recherche floue, insensible aux accents et à la casse.
- Aperçu ; ouverture de la fiche par double-clic ou Entrée.
- Glisser une ligne vers le canevas, une fiche ou un journal.

## Ouvrir le navigateur
- Raccourci `Ctrl+Maj+A` (modifiable dans les contrôles) ;
- bouton « Archive Navigator » en haut des onglets de la barre latérale ;
- par macro : `game.modules.get("archive-navigator").api.open()`.

## Développement

```bash
npm install
npm run build   # produit dist/, le dossier du module
npm run dev     # build en continu
npm run check   # vérification TypeScript / Svelte
npm test        # tests unitaires
```

Pour tester dans Foundry, liez `dist/` dans le dossier des modules :

```bash
ln -s "$(pwd)/dist" "<FoundryData>/Data/modules/archive-navigator"
```
