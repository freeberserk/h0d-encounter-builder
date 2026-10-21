# Changements H0D Encounter Builder

## v0.1.2 — Catégories du choix manuel

- Sélection en deux ou trois étapes : Machines / Faune / Factions, faction éventuelle, puis profil.
- Liste de factions dynamique issue de Faction Builder, y compris Conseil de la Dent d'Ambre.
- Composition conservée lors d'un changement de catégorie ou de faction.
- Validation : un profil masqué par les filtres ne peut pas être ajouté par erreur.
- Aucun changement aux coûts XP, RollTables, Actors ou Tokens.

## v0.1.1 — Correctif des types de rencontres

- Lire `flags.h0d.typeRencontre` pour les résultats Foundry de format `text`.
- Filtrer correctement Machines, Autres, Hors combat et Mixte dans les propositions.
- Composer une proposition mixte à partir de deux lignes documentées du biome si aucune ligne Mixte n'existe.
- Afficher les adversaires non associés à une fiche, avec avertissement sur la validation XP.
- Respecter le type sélectionné lors d'une suggestion de complément manuel.

## v0.1.0

Premier jet : intégrations des catalogues, 7 tables embarquées, composition manuelle, événements, ressources et sauvegardes.
