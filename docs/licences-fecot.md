# Licences FECOT — adaptation FEVOCO

Évolution du 4 novembre 2026 : [raccordement des saisons et de leurs statuts](licences-saisons-2026-11-04.md).
Les constats de référentiels vides ci-dessous décrivent l'audit initial.
SAISON, STATUTS_SAISON et STATUT_LICENCE ont été renseignés depuis.

## Référence et écarts avant intervention

Cible : `data/monosport/fecot-managment` uniquement, main, HEAD
1517431ca3cb786caaa914129bebf779ba6578c7. Application largement non suivie,
README et package-lock déjà modifiés : tous les travaux sont conservés.
Référence en lecture seule : `data/monosport/fevoco-managment`. Ses AGENTS,
README, CONTEXT, rapports licences/entourage/onglets/corrections de structures,
modèles, éditeurs, listes et services sont examinés. Ses instructions de
modification de fevoco-cible ne s'appliquent pas à la cible FECOT autorisée.
Les anciennes mutations de licence par acteur ne seront pas recopiées : le
parcours unifié documenté par FEVOCO fait référence.

| Priorité / type | FECOT constaté | Attendu FEVOCO / correction | Validation prévue |
| --- | --- | --- | --- |
| P1 fonctionnel | Deux pages Bientôt disponible | Page athlètes saisonnière et page entourage périodique | Listes, KPI, synthèses, filtres, états vides et panne |
| P1 harmonisation | Onglets fiches en tableau brut | Historique lisible avec saison/structure ou période/statut | Filtre par acteur avant enrichissement, sans chargement avant onglet |
| P0 métier | Pas de CRUD licences | Création/édition, renouvellement, transitions contrôlées | Unicité athlète-saison, périodes, références et confirmations |
| P0 sécurité | AUT-SPT existant | Gardes FECOT fraîches READ/WRITE, sans rôle FEVOCO | Accès refusés avant données, aucune donnée d'un autre type mélangée |
| Particularité | Schémas FECOT réels | Athlète → affiliation → club ; codes issus des références FECOT | Aucun VOL/TAC/STL de volley injecté |
| P0 configuration manquante | SAISON, STATUT_LICENCE, CYCLES_LICENCES, TYPES_ACTEURS vides | Messages explicites, écriture refusée tant que références absentes | Pas de valeur fictive ni faux compteur en cas de panne |
| P1 fiabilité | Aucun writer licence FECOT | RAW par en-tête, IDs serveur, version et confirmation, append groupé | Tests en mémoire, colonne inconnue préservée, réponse incertaine |

## Sources vérifiées en lecture seule

Métadonnées et en-têtes du classeur 04_FECOT_LICENCE :
- ATHLETE_LICENCES : id_licence, id_athlete, id_saison,
  id_affiliation_athlete, numero_licence, date_delivrance,
  id_statut_licence, observations.
- ACTEURS_LICENCES : id_licence, id_type_acteur, id_acteur,
  id_affiliation_acteur, id_cycle_licence, numero_licence,
  date_delivrance, date_debut_validite, date_fin_validite,
  id_statut_licence, observations.

Référentiels relus sur leurs 1000 lignes physiques : les quatre listes citées
ci-dessus sont vides. STATUTS_AFFILIATION est désormais renseigné ; ses codes
ne sont pas codés en dur dans le nouveau module. Aucune donnée nominative
conservée dans ce rapport, aucune écriture de test sur Google.

## Lots implémentés et règles retenues

1. Listes Athlètes et Entourage activées : cinq/six indicateurs, synthèse par
   club et par type, échéances, filtres, recherche, tri, pagination, cartes mobiles.
   Les filtres enfants Ligue → Entente → Club sont réinitialisés au changement
   de parent. Les clubs sans licence restent présents dans la synthèse.
2. Formulaires prêts avec les références chargées par la page : création,
   consultation, modification, renouvellement individuel d'acteur et par club
   d'athlètes. Aucun appel à l'ouverture du formulaire ; SearchSelect existant
   à deux caractères. Dates compactes, validation serveur et stockage ISO RAW.
3. Actions entourage confirmées : suspendre, réactiver, clôturer, annuler,
   avec transitions et statut cible résolus depuis les libellés FECOT, jamais
   depuis les codes STL du volley. Le menu compact réutilise Select FECOT ;
   aucune dépendance DropdownMenu supplémentaire n'est installée.
4. Onglets des six fiches : historique à la demande, sans formulaire d'ajout,
   recherche ou pagination. Saison/numéro/structure/délivrance/statut chez
   l'athlète ; numéro/délivrance/période/statut chez l'entourage. L'ancien endpoint
   de relations brutes reste compatible pour ses consommateurs.
5. Protection des relations : une affiliation référencée par une licence ne
   peut plus être déplacée vers un autre club/une autre entité ; clôturer puis
   créer une nouvelle relation. Dates et statut restent modifiables. La file
   locale d'écriture est commune aux affiliations et licences pour vérifier
   ces dépendances après les commandes concurrentes.

Unicité athlète–saison, même si une ancienne licence est annulée. Création
individuelle liée à une affiliation existante du même athlète ; comme dans
le domaine FEVOCO, l'affiliation historique n'est pas remplacée par l'actuelle.
Renouvellement par club : affiliation active à la délivrance, première licence
préalable, aucune licence dans la saison cible, numéro antérieur conservé.
Le lot entier est validé avant un append groupé, de 1 à 200 personnes.

Entourage : type issu de TYPES_ACTEURS.source_donnees, acteur existant dans la
bonne feuille, cycle/statut configurés, délivrance au plus tard au début,
fin après le début, aucune période chevauchante hors licences annulées.
Coachs, médecins, officiels et autres acteurs configurés doivent avoir une
affiliation du même acteur active au début de validité, vers une entité existante.
L'arbitre n'utilise aucune affiliation de club ; ses affectations et grades
restent un parcours distinct. AUTRES n'est proposé que si son type est configuré.

Les saisons d'athlètes doivent posséder des dates civiles cohérentes pour créer
une licence. Leur synthèse suit les statuts enregistrés de la saison, comme
FEVOCO. Les statuts effectifs de l'entourage (valide, à venir, expirée…) sont
calculés avec la date civile Africa/Kinshasa et restent distincts du statut stocké.
La validité périodique n'est pas recalculée automatiquement à partir d'une
affiliation ultérieure ou d'un changement de club.

Identifiants techniques nouveaux : FECOT-LIC-AAAA-NNNNNN et
FECOT-ACL-AAAA-NNNNNN, calculés côté serveur, six chiffres, épuisement refusé.
Les anciens IDs ne sont pas renommés. Le numéro officiel est une donnée
administrative séparée et modifiable. En édition, l'identité athlète/saison/
affiliation est immuable ; côté entourage, le couple type/acteur est immuable.
Les écritures se font par en-tête et préservent les colonnes inconnues.
Une empreinte du record détecte les versions périmées ; chaque écriture est
relue avant succès, sans retry automatique. Une réponse incertaine bloque
les mutations dans l'interface jusqu'à actualisation explicite.

## Lectures, CPU et confidentialité

Réutilisation de readActorSheets : clés classeur/groupe de feuilles, cache de
30 secondes, 300 secondes pour références, partage des requêtes en cours,
barrière de génération lors des invalidations. Aucun cache de droits ajouté.
Toutes les API utilisent les gardes FECOT fraîches avant les sources. Les
modifications de licence invalident ces sources et les pages rechargent les
résultats confirmés. Aucun média, passeport ou contact n'est transmis.

Pages : cinq batchGet métier à froid, zéro au second appel avec caches valides,
vérifiés sur le transport simulé ; les contrôles Google d'authentification ne
sont pas inclus. Une actualisation explicite relit les sources fraîches.
Mutation simple : cinq lectures groupées + une confirmation + une écriture,
puis la page actualise ses données. Le nombre d'appels de renouvellement ne
dépend pas du nombre de personnes sélectionnées dans le lot.

Fiche : licences filtrées par acteur/type avant projection ; acteurs,
affiliations et structures réduits aux références des licences concernées
avant enrichissement. L'historique d'arbitre ne lit ni affiliations ni territoire
ni référentiels d'entités : trois lectures groupées métier à froid. Le club
historique est joint seulement si l'affiliation appartient bien au licencié.
Une relation orpheline conserve ses IDs avec alerte, sans jointure à une autre
personne. Pas de tri ou enrichissement de collections complètes pour une fiche.

L'ancien module autonome ne lisait aucune donnée (Bientôt disponible) ;
l'historique brut coûtait moins de lectures, mais ne résolvait pas les libellés.
Ce lot ajoute des fonctionnalités : aucun gain global de CPU/API n'est annoncé.
Les comptes simulés ne sont ni des mesures réseau réelles ni des mesures Vercel.

## Validation, tâches et limites

- Analyse, mappings, deux pages, historique, CRUD, renouvellements et transitions :
  implémentés ; tests serveur et navigateur sur sources synthétiques.
- Configuration : **à renseigner séparément**. SAISON, STATUT_LICENCE,
  CYCLES_LICENCES et TYPES_ACTEURS sont vides à l'audit. Aucun code inventé,
  aucune migration automatique. Une configuration de classeur manquante indique
  le nom de variable, sans sa valeur. Une panne de source ne devient pas zéro.
- FEVOCO reste en lecture seule ; compétitions, équipes nationales, activités
  et documents restent Bientôt disponible, paramètres inchangés.
- La première colonne Licence des listes Acteurs FECOT reste le code d'acteur
  demandé antérieurement par l'utilisateur. Le numéro officiel est affiché dans
  les pages et historiques Licences ; le remplacement de cette colonne par une
  licence active, décrit dans d'autres lots FEVOCO, n'est pas imposé ici.
- Les validations des nouvelles écritures sont parfois plus conservatrices que
  les anciens éditeurs FEVOCO : saison datée, affiliation cible existante,
  empreinte de version et conservation de la structure d'une relation licenciée.
- Le verrou et la version ne constituent pas une transaction distribuée Google :
  plusieurs instances ou un éditeur externe peuvent intervenir entre lecture
  et écriture. Aucun verrou distribué ni rollback de données n'est revendiqué.
- Contrôles clavier complets/lecteur d'écran et écriture Google réelle non réalisés.
  La recette utilise les vrais composants, handlers et services, frontière Google
  simulée. Le connecteur n'a été utilisé que pour métadonnées/en-têtes/référentiels.

Les résultats finaux sont ajoutés après les contrôles. Journaux et captures :
`test-results/licences*`, ignorés par Git, données entièrement synthétiques.

## Fichiers et retour arrière ciblé

Nouveaux : `lib/licences/{model,service,api,write-queue}.ts`,
`app/api/licences/[group]/route.ts`, `components/licences/{licences-page,
licences-client,licence-editor,licence-history}.tsx`, fixture/tests et harnais UI.
Adaptés : deux pages app/(dashboard)/licences, actors-client, actors/service
(ID des deux feuilles de licences reconnu par en-tête), affiliations/service
(garde de déplacement), affiliations/api (file partagée), fixtures et recettes
Acteurs/Bientôt disponible, README et documentation.

Retour arrière applicatif : rétablir les deux ModulePending et le rendu brut des
onglets, puis retirer uniquement les imports et modules de ce lot. Conserver
les travaux territoriaux, affiliations et tableau de bord. Ne pas supprimer
ou renuméroter des licences déjà créées. Aucun changement de schéma à annuler.
Avant usage réel : remplir les quatre références par une intervention autorisée,
vérifier les variables FECOT, puis recette READ/WRITE sur un classeur de test
distinct, y compris confirmation, source indisponible et accès refusé.
Aucun commit, push, déploiement ou écriture de test en production.

## Résultats finaux

- `npm.cmd test` : **141 tests réussis**, dont 16 tests spécifiques Licences.
  Le lot initial de référence comptait 125 tests. Les cas couvrent les droits,
  références vides/manquantes, unicité, dates, renouvellements, transitions,
  concurrence locale, garde des affiliations licenciées, colonnes déplacées,
  ancienne structure, propriétaire incohérent et confirmations incertaines.
- `npm.cmd run lint` : réussi ; ce script est un alias de TypeScript, pas
  un contrôle ESLint distinct. TypeScript indépendant également réussi.
- Chromium isolé : **6 scénarios Licences**, **12 parcours Acteurs** et
  **12 vérifications des pages encore en préparation**, sans erreur JavaScript.
  Créations, modifications, renouvellement collectif, suspension/réactivation,
  renouvellement individuel, filtres, lecture seule, vide/panne et mobile 390 px
  testés. Les captures principales 1440 et 390 pixels sont ouvertes et examinées.
  Les screenshots sont pris après retour en haut pour éviter un artefact de
  capture pleine page de l'en-tête sticky. Les sélecteurs de numéros ont été
  adaptés au texte composite des cartes mobiles après un premier échec de harnais.
- Build Next **normal réussi**, code 0, environ 78 secondes, 179 fichiers
  applicatifs vérifiés et inchangés dans la copie isolée. Aucun fichier `.env`
  de production ni réglage pour ignorer TypeScript ; serveur local préservé.
  L'avertissement de racine du lockfile concerne cette copie isolée. Les
  avertissements Node MODULE_TYPELESS_PACKAGE_JSON des tests sont préexistants.
- `git diff --check` : réussi, avertissement de conversion LF/CRLF de README.
  `git diff --stat` ne montre que README/package-lock, car le reste de l'application
  est non suivi. Le package-lock était déjà modifié avant ce lot ; aucune
  dépendance n'a été installée ou changée par cette intervention.

Preuves : `test-results/licences-{all-tests,tests,typescript,browser,
actors-browser,pending-browser}.log`, `test-results/licences/{browser.json,
build.json,build.log,athletes-1440.png,athletes-390.png,entourage-1440.png,
entourage-390.png}`. Aucun résultat n'est présenté comme une écriture Google
réelle, une recette de session de production ou une mesure CPU Vercel.

État Git global conservé : README et package-lock modifiés ; app, components,
lib, docs, tests, scripts et fichiers de configuration déjà non suivis.
Le manifeste des fichiers du lot ci-dessus précise les seuls changements
attribués à cette intervention. FEVOCO reste inchangé.
