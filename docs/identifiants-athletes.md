# Identifiants des athlètes FECOT

Extension ultérieure : les autres catégories utilisent aussi des séries lisibles, détaillées dans [les formats de tous les acteurs](identifiants-acteurs.md). ATH conserve ses cinq chiffres ; les mentions ci-dessous de génération antérieure des autres catégories décrivent le premier lot ATH.

Changement demandé par l'utilisateur le 2 novembre 2026 : remplacer la génération UUID des athlètes par `ATH00001`, `ATH00002`, etc. Périmètre : athlètes seulement, aucun changement des autres catégories ni des dépôts de référence.

## Génération

`nextAthleteId` dans `lib/actors/model.ts` calcule le maximum des suffixes numériques `ATH` déjà présents et ajoute un, avec cinq chiffres et zéros initiaux. La série commence à `ATH00001` ; les trous intérieurs ne sont pas comblés. Au-delà de `ATH99999`, la création est refusée explicitement. Les anciennes clés UUID ou autres restent lisibles et modifiables ; elles ne sont pas renommées automatiquement.

`saveActor` utilise ce calcul côté serveur, sur la catégorie relue fraîchement, sous la file de mutations existante. Le client ne choisit pas la clé. Les modifications ordinaires conservent l'ID. Les identifiants national et WT restent des champs distincts et conservent leurs validations. Les créations des autres acteurs gardent leur génération antérieure.

Limite : la file de mutations sérialise une instance Node ; Sheets ne fournit pas de contrainte unique ou transaction distribuée entre instances. Cette série n'offre pas une garantie d'allocation atomique globale. Il faut une allocation centralisée si plusieurs instances créent simultanément des athlètes. Ne pas supprimer manuellement la dernière ligne puis en réutiliser la clé : elle pourrait encore être référencée ailleurs. Aucune fonction de suppression d'athlète n'est introduite.

## Renommage expressément autorisé de l'athlète existant

Classeur vérifié : `02_FECOT_ACTEURS`, feuille `ATHLETES`, cellule `A2`, sheetId `325296645`. Un seul ID d'athlète présent lors de la lecture de `A1:A1001` :

| Ancien ID | Nouvel ID |
| --- | --- |
| FECOT-ATH-8d6d8fee-cec4-4f19-9623-064fbf3572a1 | ATH00001 |

Avant écriture, métadonnées et en-têtes des classeurs FECOT relus via le connecteur Drive. Colonnes de dépendance examinées :

- Affiliations : ATHLETE_AFFILIATIONS.B, MANDATS.B, AUTRES_AFFILIATIONS.E, OFFICIELS_AFFILIATIONS.E.
- Licences : ATHLETE_LICENCES.B, ACTEURS_LICENCES.C.
- Compétitions : COMPETITIONS_PARTICIPANTS.F, COMPETITIONS_UNITES.F, COMPETITIONS_INTERVENANTS.D, COMPETITIONS_DISTINCTIONS.F.
- Équipes nationales : SELECTIONS_ATHLETES.C, AFFECTATIONS_STAFF.D.
- Activités : ACTIVITES_ENTITES.C, ACTIVITES_PARTICIPANTS.D.
- Documents : DOCUMENTS_RELATIONS.D.
- Journal : JOURNAL_OPERATIONS.E. Aucun champ de référence acteur dans les structures territoriales ou le schéma USERS actuel.

Ces 16 colonnes ont été lues jusqu'à leur dernière ligne physique indiquée par les métadonnées : aucune occurrence de l'ancien ou du nouvel ID, aucune formule dans les colonnes lues. Pas de média lié dans Q2:T2. Aucune dépendance à réécrire. Aucun nom, contact ou donnée de passeport conservé dans ce document.

Relecture des IDs juste avant écriture, vérification de la cellule littérale et de l'absence de validation bloquante. Écriture native `findReplace` strictement limitée à A2, sensible à la casse, cellule entière égale à l'ancien ID : une occurrence, une cellule, une ligne et une feuille modifiées. Relecture `CellData` : `userEnteredValue.stringValue`, `effectiveValue.stringValue` et `formattedValue` valent tous `ATH00001`. Format, en-tête et cellules voisines préservés. Aucun autre classeur modifié, aucune écriture de test Google, aucun partage, push ou déploiement.

Les restrictions « aucune écriture production » du lot d'audit initial restent vraies pour ce lot initial ; ce renommage précis relève de l'instruction ultérieure explicite de l'utilisateur. Retour arrière uniquement sur instruction : vérifier de nouveau toutes les dépendances puis restaurer l'ancienne clé avec ses références éventuelles, jamais une cellule isolée si de nouvelles relations ont été créées depuis.

## Vérification

`npm.cmd test` : 101 tests réussis, dont `tests/athlete-id.test.ts` (premier ID, incrément, zéros, maximum, anciennes clés, épuisement, concurrence locale, ID non choisi par formulaire et modification conservant la clé). TypeScript : `npm.cmd run typecheck`. Les scénarios d'écriture des tests restent en mémoire. Résultats locaux ignorés : `test-results/athlete-id-tests.log` et `test-results/athlete-id-typescript.log`.
