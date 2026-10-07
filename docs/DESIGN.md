# Archive Navigator — Document de conception

## 1. Objectif

Une fenêtre **complémentaire** à l'interface de Foundry VTT qui permet au MJ de
parcourir, rechercher et manipuler en masse le contenu du monde (acteurs,
objets, journaux, scènes, tables, macros, playlists, cartes) depuis un seul
endroit.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Plateforme | Foundry VTT v14 (vérifié sur le build 365) |
| Intégration | Fenêtre supplémentaire ; la barre latérale native reste intacte |
| Public | MJ uniquement pour l'instant ; architecture prévue pour une future version joueurs |
| Système | Socle générique + adaptateur **dnd5e** pour la recherche avancée |
| Technique | Svelte 5 + Vite + TypeScript, rendu dans une `ApplicationV2` |
| Suppression | Toujours via une **corbeille** restaurable |
| Corbeille | Option A : un compendium créé et géré uniquement par le module |
| Compendiums existants | **Lecture seule** : recherche, comparaison, import vers le monde. Jamais modifiés |

## 3. Architecture

```
┌─ UI (Svelte) ─────────────────────────────────────────────┐
│ Arborescence · Liste/Grille/Tableau · Aperçu              │
│ Barre d'actions · Vue Doublons · Recherche avancée        │
├─ Stores ──────────────────────────────────────────────────┤
│ sélection · filtres · vue courante                        │
├─ Services ────────────────────────────────────────────────┤
│ IndexService      index monde (hooks) + compendiums       │
│ ActionRegistry    actions déclaratives (types, droits)    │
│ SearchService     requête, facettes, adaptateurs système  │
│ DuplicateService  détection et regroupement               │
│ ReferenceService  où un document est-il utilisé ?         │
│ TrashService      mise en corbeille / restauration        │
├─ Permissions ─────────────────────────────────────────────┤
│ testUserPermission + drapeau gmOnly par action            │
└───────────────────────────────────────────────────────────┘
```

- `ApplicationV2` gère le cadre de la fenêtre ; Svelte est monté dans
  `.window-content` (`_replaceHTML`) et démonté à la fermeture (`_onClose`).
- **IndexService** garde un index léger (`IndexEntry` : uuid, nom normalisé,
  type, sous-type, image, dossier, compendium). L'index du monde est
  reconstruit (avec un délai anti-rebond) sur les hooks `create/update/delete`
  de chaque type ; les compendiums sont indexés à la demande via
  `pack.getIndex({ fields })`.
- **Version joueurs** : toute action passe par l'`ActionRegistry`, qui décide
  de sa disponibilité selon l'utilisateur et les documents. Ouvrir le module
  aux joueurs reviendra à autoriser certaines actions, sans réécrire l'UI.

## 4. Fonctionnalités

### 4.1 Navigation (étape 2)
- Trois colonnes : types et dossiers · résultats · aperçu.
- Portée : Monde / Compendiums / Tout.
- Un dossier sélectionné inclut ses sous-dossiers.
- Double-clic ou Entrée : ouvre la fiche. Glisser une ligne : format natif
  `{ type, uuid }`, compatible avec le canevas, les fiches et les journaux.

### 4.2 Sélection multiple et actions groupées (étape 3)
- Clic, `Ctrl`+clic (ajout/retrait), `Maj`+clic (plage), `Ctrl+A` (tous les
  résultats **filtrés**), cases à cocher.
- La sélection peut mélanger les types ; compteur détaillé par type.
- Barre d'actions : supprimer (corbeille), déplacer vers un dossier,
  dupliquer, droits d'accès, tags, export vers un compendium du module.
- Une action ne s'applique qu'aux éléments compatibles et ignore les autres.
- Confirmation avec la liste exacte des éléments et des avertissements
  (tokens sur des scènes, liens dans des journaux, possédé par un joueur).
- Opérations par lots (`deleteDocuments` / `updateDocuments` par paquets).
- Les entrées de compendium sont sélectionnables, mais seules les actions
  non destructrices (import, comparaison) leur sont proposées.

### 4.3 Corbeille (étape 3)
- Un compendium du monde de type **Adventure**, créé à la première
  suppression : `archive-navigator-trash`. Une Adventure peut contenir des
  acteurs, objets, journaux, scènes, tables, macros, playlists et cartes ; un
  seul compendium suffit donc pour tous les types.
- Chaque suppression groupée crée une entrée « Corbeille — date — N éléments »
  contenant les documents et leurs `_id` d'origine.
- Restauration : totale ou partielle, en conservant les identifiants (les
  liens `@UUID` redeviennent valides).
- Vidage manuel, ou automatique après N jours (paramètre).

### 4.4 Glisser-déposer (étape 4)

| Source → Cible | Effet |
|---|---|
| Sélection → dossier du navigateur | Déplacement groupé |
| Acteurs → canevas | Tokens posés en grille autour du point de dépôt |
| Objets → fiche d'acteur | Ajout à l'inventaire |
| Document → journal | Lien `@UUID` |
| Entrées de compendium → dossier du monde | Import (copie) |
| Barre latérale Foundry → navigateur | Accepté |

- Un élément seul : format natif `{ type, uuid }`. Plusieurs : format étendu
  `{ type: "ArchiveNavigatorSelection", uuids: [...] }` compris par nos cibles.
- Badge « N éléments » sous le curseur, zones de dépôt surlignées, dépliage
  automatique des dossiers au survol.
- Alternative clavier : menu « Déplacer vers… » avec recherche de dossier.

### 4.5 Doublons (étape 5)
**Détection**, par type, avec des critères combinables :
1. nom identique après normalisation (casse, accents, espaces, suffixes
   « (Copy) », « (2) ») ;
2. contenu identique : empreinte des données hors `_id`, `folder`, `sort`,
   `ownership`, `_stats` ;
3. nom similaire (seuil réglable) ;
4. même image.

Périmètre : monde seul, ou monde comparé aux compendiums (référence seulement).

**Revue** groupe par groupe : comparaison côte à côte avec les différences
surlignées, analyse d'utilisation (tokens, liens `@UUID`, propriétaires,
combats), suggestion de l'élément à conserver (le plus référencé, puis le plus
ancien).

**Résolution** : les autres éléments vont à la corbeille ; option pour
réécrire les liens `@UUID` des journaux vers l'élément conservé. Résolution
groupée possible, toujours après confirmation. Seuls les documents du monde
peuvent être supprimés.

### 4.6 Recherche avancée (étape 6)
- **Recherche rapide** : floue, sans accents ni casse, sur le monde et les
  compendiums, résultats regroupés par type.
- **Facettes** adaptées au type, avec compteurs :

| Type (dnd5e) | Facettes |
|---|---|
| Sorts | niveau, école, classe, composantes V/S/M, concentration, rituel, temps d'incantation, portée, type de dégâts, sauvegarde |
| Objets | type, rareté, prix, poids, magique, harmonisation, propriétés d'arme |
| PNJ | FP, type de créature, taille, alignement, PV, CA, résistances et immunités, environnement |
| Journaux | texte intégral des pages |
| Scènes | dimensions, tokens présents, active ou non |

- **Syntaxe** synchronisée avec les facettes :
  `type:spell level:1..3 school:evo damage:fire concentration:no`
- Texte intégral (descriptions, pages de journaux) en option, avec le passage
  surligné dans l'aperçu.
- Recherches enregistrées, vue tableau triable.
- **Adaptateurs** : un adaptateur déclare les champs à indexer et les
  facettes à afficher. Le socle générique repère automatiquement les champs
  simples du système ; l'adaptateur dnd5e fournit les facettes et les
  libellés soignés.

## 5. Feuille de route

1. ✅ **Socle** : manifeste v14, build Vite/Svelte, fenêtre ApplicationV2,
   raccourci `Ctrl+Maj+A`, bouton dans la barre latérale, IndexService.
2. ✅ **Navigation de base** : types, dossiers, portée, recherche floue,
   aperçu, ouverture, glisser une ligne.
3. Sélection multiple, barre d'actions, corbeille.
4. Glisser-déposer complet.
5. Doublons.
6. Recherche avancée avec l'adaptateur dnd5e.
7. Ensuite : tags et collections virtuelles, palette `Ctrl+K`, vue tableau,
   graphe de relations, version joueurs.

## 6. Points ouverts
- Doublons : faut-il aussi relier les tokens des scènes à l'acteur conservé ?
- Liste des résultats : virtualiser l'affichage si la limite de 500 lignes
  devient gênante.
