# Listes et fiches des autres acteurs — référence FEBACO

Demande : étendre l'harmonisation des athlètes aux entraîneurs, arbitres, officiels, médecins et autres acteurs. Cible unique FECOT, références FEBACO lues sans modification sous `app/dashboard/{coachs,arbitres,officiels,medecins,autres}/{page.tsx,[id]/page.tsx}`. Aucun push, déploiement ou changement de classeur dans ce lot.

## Listes

Dernière règle confirmée le 3 novembre 2026 : ID national et ID WT sont rétablis pour toutes les catégories qui possèdent ces champs, comme cela avait été fait pour les arbitres. Les en-têtes restent en majuscules ; les cartes mobiles utilisent les mêmes libellés. Seule la première colonne garde le titre Licence. Les anciennes demandes de libellés Licence nationale/Licence WT ci-dessous sont historiques. Aucun changement des valeurs, mappings ou relations.

Correction spécifique demandée pour les arbitres : les colonnes id_national et id_wt portent de nouveau les libellés ID national et ID WT (affichés en majuscules dans le tableau). Les cartes mobiles réutilisent ces mêmes libellés. La première colonne reste Licence. Les autres catégories et toutes les valeurs stockées restent inchangées. Recette ciblée : `node --experimental-strip-types scripts/actors-ui-qa.mjs --arbitres-only` et TypeScript, preuves `test-results/arbitres-id-headings-{browser,typescript}.log`.

Mise à jour explicite des libellés : tous les en-têtes des listes Acteurs sont affichés en majuscules, y compris les boutons de tri dont le style natif empêchait l'héritage de text-transform du th. Correctif limité au tableau Acteurs via `[&_th_button]:uppercase`. La colonne Photo devient Avatar pour les athlètes ; Nationalité est retirée de la liste des entraîneurs (champ conservé dans les données et formulaires). Après clarification utilisateur, toutes les colonnes contenant ID sont renommées : Licence, Licence nationale et Licence WT, également pour les libellés des cartes mobiles concernés. Ce sont des libellés d'affichage autorisés : ils conservent les valeurs des clés/id_national/id_wt et ne déclenchent aucun raccordement nouveau au classeur des licences. Les clés, relations, formulaires et titres des fiches ne sont pas renommés par ce lot.

Contrôles de cette mise à jour : `scripts/actors-ui-qa.mjs` vérifie les libellés exacts des six listes et le text-transform calculé des en-têtes/boutons, avec les parcours ordinateur/mobile existants. TypeScript est contrôlé. Preuves : `test-results/actors-list-headings-{browser,typescript}.log`. Aucune requête Google supplémentaire, aucune écriture métier, aucun push ni déploiement.

Toutes les listes Acteurs utilisent maintenant la même famille Geist pour le tableau et ses en-têtes. Les cellules d'identifiants conservent le monospace approprié, sans contaminer la police de leurs th. Tableaux, filtres, recherche, pagination, choix du nombre de lignes et actions sont les composants existants.

| Catégorie | Adaptation de la liste sur FEBACO |
| --- | --- |
| Entraîneurs | Avatar, Nom complet, Niveau, Sexe / âge, Nationalité, ID national, ID WT, Statut |
| Arbitres | Avatar intégré au Nom complet, Sexe / âge, Grade, ID national, ID WT, Statut |
| Officiels | Avatar, Nom complet, Sexe / âge, ID national, ID WT, Statut |
| Médecins | Avatar, Nom complet, Spécialité, Sexe / âge, ID national, ID WT, Statut |
| Autres acteurs | Nom complet, Type FECOT, Sexe, Téléphone, Statut |

La première colonne conserve les codes d'acteurs (ATH00001, COA-0001…), sous l'intitulé Licence explicitement demandé, ainsi que les actions. Ce changement de libellé ne charge ni ne crée d'enregistrement dans les feuilles Licences ; leur raccordement reste distinct et leurs accès applicatifs sont un blocage connu. La vue Athlètes conserve ses colonnes sans niveau.

L'âge est uniquement un affichage dérivé de la date réelle, sans catégorie d'âge sportive calculée. Dates ISO, françaises, compactes et sérielles Sheets reconnues ; dates invalides ou futures affichées sans âge. Sexe inconnu jamais assimilé à Masculin. Les cartes mobiles conservent les données clés, les identifiants et les actions, sans nouveau chargement réseau.

Le téléphone est désormais inclus dans la projection de liste uniquement pour AUTRES, car il y est une colonne du tableau de référence. Il est conservé lors de l'application locale d'une réponse de modification. Aucun courriel, adresse ou passeport supplémentaire n'est exposé dans les listes ; aucune nouvelle lecture Google pour ce champ déjà chargé dans la même catégorie.

## Fiches

Réutilisation du composant Athlètes, renommé `components/actors/actor-detail-view.tsx`. Profil avec avatar et nom, action photo pour WRITE, Retour/Modifier, onglets Général/Affiliations/Licences de largeur égale et navigation clavier. Les fiches ne contiennent plus de blocs de passeport supplémentaires.

- Entraîneurs, arbitres, officiels et médecins : quatre blocs Général, dans l'ordre de leur référence FEBACO : Identité, Identifiants, Contact, Observations.
- Autres acteurs : trois blocs, comme la référence spécifique FEBACO : Identité, Coordonnées, Observations. Type et Entité utilisent les champs réels FECOT ; aucun champ Rôle fictif ajouté et aucun identifiant national/international absent du schéma.
- Athlètes : quatre blocs déjà validés, ordre Identité, Contact, Identifiants, Observations inchangé.

Les arbitres gardent leur Grade dans Identifiants, les médecins leur Spécialité dans Identité. ID WT remplace ID FIBA. Les niveaux d'entraîneur restent présents dans la liste et le formulaire, sans bloc supplémentaire dans Général. Les champs inexistants dans une feuille FECOT ne sont pas inventés. Les observations réelles, lorsqu'elles sont présentes, sont affichées ; les valeurs historiques restent conservées par les formulaires et services existants.

Adaptations légitimes : l'onglet Affectations des arbitres conserve l'accès FECOT à ARBITRE_AFFECTATIONS et ARBITRES_GRADES, distinct d'une affiliation de club, même si la fiche basket correspondante ne propose que Général et Licences. Les relations des autres acteurs restent accessibles par onglets FECOT, chargés à la demande, alors que FEBACO AUTRES affiche une fiche simple. Les rattachements médicaux géographiques ne sont pas inventés ni préchargés dans Général. Les statuts/dates des licences ne sont pas assimilés à ceux des acteurs.

Droits frais serveur, permissions UI, uploads privés, confirmation d'écriture et gestion des réponses tardives sont conservés. Les sources de listes/fiches restent les mêmes. Aucun rapprochement par nom, changement d'ID, suppression de données ou nouvelle invalidation globale.

## Fichiers et validation

Correctif du renommage : l'ancien chemin `athlete-detail-view.tsx` est maintenu comme simple réexport vers `ActorDetailView`, sans autre implémentation. Le compilateur de développement avait conservé l'ancien import pendant la suppression/renommage. L'import courant du client utilise bien `actor-detail-view.tsx`. Le test `tests/actors-imports.test.ts` reproduit l'échec de résolution avant l'alias et vérifie sa résolution après ; aucun cache, processus partagé ou fichier .next supprimé.

Application : `components/actors/{actors-client,actor-detail-view}.tsx`, `lib/actors/{model,presentation}.ts`. Tests : `tests/actors-{model,presentation}.test.ts`, `scripts/actors-ui-qa.mjs`. L'ancien fichier `athlete-detail-view.tsx` est remplacé par le composant commun ; aucun doublon de fiche conservé.

`npm.cmd test` : 105 tests réussis, dont nouveau contrat de projection du téléphone AUTRES et calcul d'âge/sexe. TypeScript vérifié. Recette Chromium sur six catégories et deux formats, avec styles générés depuis les sources courantes : ordre des colonnes, famille des en-têtes, recherche/filtres/pagination sans réseau supplémentaire, ouverture instantanée des formulaires, liste → fiche → modification, création en mémoire, trois/quatre blocs selon catégorie, aucune carte Passeport, alignement des onglets, panne de source secondaire visible, aucun débordement et actions WRITE absentes des listes/fiches en lecture seule. Les tests ne lisent ni n'écrivent de données personnelles Google.

Preuves locales ignorées : `test-results/actors-all-views-{tests,unit,browser,typescript}.log` et `test-results/actors-audit-20261102/{browser.json,actors-<categorie>-<list|detail>-<desktop|mobile>.png}`. La recette réelle des relations reste soumise aux accès Google documentés. Aucun résultat de build postérieur à ce lot n'est revendiqué.

Retour arrière ciblé : annuler les adaptations de colonnes, rétablir l'ancien composant et ses imports, retirer le champ téléphone de la projection AUTRES et le helper de présentation si devenu inutilisé. Ne pas toucher aux IDs ATH, aux autorisations ou aux travaux territoriaux. Aucune donnée Google à restaurer pour ce lot d'affichage.
