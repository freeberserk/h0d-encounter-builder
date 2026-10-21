# H0D Encounter Builder — v0.1.1 (correctif types de rencontres)

Module Foundry VTT **v14** / **Custom System Builder 6.x** pour la campagne **JDR Zero Dawn**. Remplace la macro « table de rencontre » (qui reste indépendante tant que tu ne la supprimes pas).

**Principe : l'Encounter Builder construit et valide une proposition de rencontre ; le MJ génère lui-même les Actors et place les Tokens.**

## Ce qui fonctionne dans cette première version

- **RollTables** : lecture des tables du monde (prioritaires), ou des **7 exports** fournis en secours, sans importer ni modifier aucune table. Les doublons portant le même nom sont départagés par `flags.h0d.version` décroissant (Vallée V2 plutôt que V1).
- **Mode manuel** : choix d'une machine, créature ou archétype de faction via l'API d'un builder actif, ajout de quantité, suppression. Les neuf membres du Conseil issus de `Faction Builder` sont également proposés si leurs données sont exposées.
- **Mode « Composition proposée »** : composition basée sur les recettes de biome structurées et sur les **coûts individuels effectivement documentés**. Actuellement, les Gorges sont le biome pilote ; d'autres mappings partiels sont fournis.
- **Calculs** : conservation du tableau des budgets XP de la macro d'origine, niveaux **1–10 seulement**, facteur défavorable facultatif **+25 %**, comparaison au plafond. Les niveaux 11–15 sont accessibles **sans plafond chiffré** en attendant un barème validé.
- **PNJ** : les trois PJ sont fixes. Tu peux inscrire des alliés (combat / appui / non engagés) : ils sont affichés, **sans conversion automatique en PJ ni bonus XP inventé**.
- **Événements** : tirage indépendant avec probabilité réglable, propositions d'ambiance et de dangers, sans DD ni coût inventés ; les exemples sont explicitement éditoriaux et **non de nouveaux canons**.
- **Découvertes** : tirage indépendant depuis la RollTable officielle **H0D Loot — Ressources machine** ou **Ressources créature**, ou depuis le catalogue **Equipment Builder**. Les exports de butin sont embarqués comme secours. Ce sont **des suggestions**, sans création/transfert d'Item, et l'équipement n'est pas encore filtré par biome/rareté.
- **Sauvegarde** : enregistre la composition manuelle dans les réglages du monde ; peut la recharger. Ne touche pas aux RollTables.
- **Sortie** : résultat dans la fenêtre persistante, bouton d'envoi au **chat privé du MJ**.

## Limites connues à conserver en tête

1. **L'XP n'est pas une fonction de Menace.** Les Creature et Faction Builders laissent de nombreux champs XP à `0` par défaut. Le module **ne traite pas ces zéros comme des coûts documentés**. Pour chaque profil, seul un coût explicitement rapproché d'une table du projet est autorisé dans `data/costs.json` (source indiquée). Les associations incertaines sont signalées provisoires.
2. Les budgets viennent de la macro et **n'ont pas encore été recalibrés pour 3 PJ**. « Dans le budget » n'est pas synonyme de « combat sans risque ».
3. Les tables d12 originelles sont **textuelles** et certaines rencontres n'ont pas d'équivalent sûr parmi les builders actuels (anciennes recrues, hyènes, chacals, etc.). Le module affiche leur description et leur coût historique, **sans inventer une fiche**. Les Gorges ont des associations structurées dans `data/recipes.json`, les autres biomes ont des associations partielles.
4. Les deux exports absents **Plaines de Récupération** et **Terres Restaurées d'HelioSium** peuvent être chargés dans le monde Foundry : ils seront automatiquement lus s'ils portent les noms attendus. À défaut, le mode RollTable indique qu'aucune rencontre n'est disponible pour ces biomes.
5. Les dangers de terrain tirés indépendamment n'ont pas de DD ni de valeur XP automatique. Le **+25 %** est le facteur hérité de la macro, à arbitrer pour éviter les doubles comptes.
6. Les modules sources sont **facultatifs**, mais sans leurs API, le mode composition ne peut pas afficher leurs profils. Leur absence est signalée. Le mode RollTable reste utilisable.
7. Aucune synchronisation active « nouveau profil ajouté ⇒ nouveau biome » : le catalogue des profils est lu au moment de l'ouverture de l'interface, mais la pertinence géographique est déterminée par les recettes éditables du biome ; une nouvelle machine doit y être référencée pour être proposée automatiquement.

## Installation manuelle immédiate

Décompresse le **zip Foundry** (`h0d-encounter-builder-foundry-v0.1.0.zip`) dans les modules de ton serveur, sous le dossier :

`Data/modules/h0d-encounter-builder/`

Le fichier `module.json` doit se trouver directement dans ce dossier. Active ensuite **H0D Encounter Builder** dans la configuration des modules du monde BAC.

La macro **« H0D — Encounter Builder »** est créée automatiquement. Tu peux la mettre dans la barre rapide ; l'ancienne macro pourra être désactivée après vérification.

> Ne pas coller les fichiers JSON des tables dans `Data/tables` : le module possède un **jeu de secours interne** ; il utilise automatiquement les véritables RollTables du monde lorsqu'elles sont présentes.

## Nouveau dépôt GitHub (à faire une seule fois)

1. Créer un dépôt **`freeberserk/h0d-encounter-builder`** (branche `main`).
2. Extraire le **zip GitHub** (`h0d-encounter-builder-github-kit-v0.1.0.zip`) à la racine du dépôt et y placer les fichiers.
3. Commiter sur `main`.
4. Pousser sur `main` : le workflow `.github/workflows/foundry-release.yml` lance les tests puis publie automatiquement la release **`v0.1.0`** avec `module.json` et `h0d-encounter-builder.zip`. Pour une future version, augmenter `version` dans `module.json` et `package.json` avant de pousser.
5. Installer dans Foundry via le **manifest** GitHub après publication :

`https://github.com/freeberserk/h0d-encounter-builder/releases/latest/download/module.json`

**La publication sur GitHub n'est pas automatique en créant le kit local.** Le lien manifest ci-dessus ne devient actif qu'une fois le dépôt et la release publiés.

## API du module

```js
game.h0dEncounterBuilder.open();
game.h0dEncounterBuilder.status();
game.h0dEncounterBuilder.profiles();
game.h0dEncounterBuilder.getTable('gorges');
game.h0dEncounterBuilder.validate([
  {id:'machine:watcher',qty:2},
  {id:'machine:scrapper-standard',qty:1}
],{level:3,difficulty:'standard'});
```

Le dernier exemple renvoie **70 XP connus**, issus des RollTables de la Vallée et des Gorges, ainsi qu'un avertissement rappelant les limites d'équilibrage pour 3 PJ.

## Fichiers de données éditables

- `data/seed-tables.json` : résultats normalisés des sept RollTables v2, en secours.
- `data/recipes.json` : associations **texte de la table → clés des builders** ; `null` signifie association non validée, `[]` représente un événement sans adversaire.
- `data/costs.json` : XP unitaires avec référence explicite ; aucune conversion Menace → XP.
- `data/events.json` : événements naturels/technologiques non chiffrés, éditoriaux.
- `data/seed-loot.json` : secours de lecture des exports H0D Loot machine/créature.

L'ajout d'une recette ou d'un coût requiert une mise à jour du module et une validation MJ ; ne pas recopier d'Actors générés.

## Tests locaux

Depuis Node.js 20+ :

```sh
npm test
npm run check
```

Les tests contrôlent notamment la validation 2 Watchers + Scrapper = 70 XP, le respect strict des plafonds, les coûts inconnus, la distinction scène hors combat et la sélection des tableaux.

## Correctif v0.1.1

- Les catégories Foundry sont désormais lues dans `flags.h0d.typeRencontre`, pas dans `RollTableResult.type` (qui vaut `text`).
- « Autres attaquants » et « Mixte » sont respectés dans le tirage **et** la composition proposée.
- Dans les Gorges, quand aucune ligne n'est mixte, une machine et une autre rencontre peuvent être assemblées sans dépasser le budget XP historique total.
- Les ennemis non associés avec certitude à un profil des builders restent affichés en texte, sans XP individuel inventé.
- Le mode manuel reste libre ; la suggestion de complément respecte le type choisi.
