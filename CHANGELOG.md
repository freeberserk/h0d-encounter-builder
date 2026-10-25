# Changements H0D Encounter Builder

## v0.1.5 — Précautions HELIOS
- Import des métadonnées `combatReady` et `incomplete` depuis H0D Faction Builder v0.6.4.
- Étiquettes explicites pour les références non chiffrées et affichage de la Menace inconnue.
- Avertissements sur la disponibilité réelle des fiches et sur le comportement pacifique du Gardien Nexus.
- Aucune génération de statistiques ni de coûts XP.

## v0.1.4 — Factions PDF, recettes de fin de campagne et protections
- Intégration des profils Dent d'Ambre et HelioSium en lisant le Faction Builder v0.6.3, sans duplication de catalogues.
- Liste des 9 recettes HelioSium sous le choix manuel ; conditions scénaristiques explicites, boss final unique jamais tiré.
- Informations de liaison / rareté / conditions affichées depuis les métadonnées de profils.
- Analyse tactique : phalanges, réseau, opérateur/plateforme, priorités du Noyau, Avatar, boss multiphase.
- Aucune nouvelle règle XP, aucune création automatique de fiches.

## v0.1.3 — Validation manuelle et table de sources de découvertes

- Bouton **Valider la composition et vérifier le budget XP** placé dans le bloc du choix manuel.
- Récapitulatif vivant du total documenté / plafond, avec signalement d'un dépassement certain même si d'autres coûts sont absents.
- Validation indépendante des tirages de loot, qui restent facultatifs.
- Création automatique une seule fois de la RollTable **H0D Encounter — Sources de découvertes**.
- Trois sources initiales de même poids : machines, faune et équipement ; édition des poids par le MJ.
- Nouvelle option **Aléatoire (table Foundry)** par défaut pour la source de découvertes.
- Le tirage de source précède celui du contenu et respecte les catalogues H0D Loot / Equipment disponibles.
- Aucune modification des anciennes RollTables, des Actors ou des Items.

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
