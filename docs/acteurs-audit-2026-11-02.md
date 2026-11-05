# Acteurs FECOT — audit, tâches et livraison locale

Extension Licences ultérieure : [adaptation FEVOCO](licences-fecot.md).
Les deux pages dédiées sont activées et les onglets des six catégories affichent
les historiques enrichis à la demande. Les descriptions de relations brutes et
d'absence de writer licence dans le lot initial ci-dessous restent historiques.

Évolution ultérieure du bloc Affiliations : [audit et adaptation FEBACO](affiliations-fecot.md).
Les cinq catégories affiliables disposent désormais d'un panneau de consultation,
création et modification, avec rattachement direct des athlètes aux clubs.
Les mentions « lecture seule » ci-dessous décrivent le lot initial ; les licences,
affectations/grades d'arbitres et le raccordement inverse aux clubs ne sont pas
transformés en CRUD par cette extension. Référentiels FECOT vides : configuration
métier préalable à toute création réelle, sans codes basket par défaut.

Référence visuelle absolue : `data/monosport/febaco-managment`. Référence complémentaire en lecture seule : `data/monosport/fevoco-managment`. Cible unique : `data/monosport/fecot-managment`. Chemins résolus et instructions applicables lues. Les instructions FEVOCO concernent ses propres modifications : elles ne modifient pas le périmètre FECOT autorisé par l'utilisateur.

## Référence figée

Évolution ultérieure des clés : toutes les créations Acteurs utilisent désormais les [formats simples par catégorie](identifiants-acteurs.md), avec renommage ciblé de l'entraîneur existant en COA-0001 après vérification de ses dépendances. Les descriptions UUID des lots initiaux ci-dessous sont historiques ; aucune renumérotation automatique des autres clés historiques.

Extension visuelle demandée ensuite : listes et fiches des entraîneurs, arbitres, officiels, médecins et autres acteurs harmonisées avec leurs références FEBACO, dans le composant commun de fiche. Voir [règles et validation des autres acteurs](autres-acteurs-vues-febaco.md). Aucun changement de classeur pour cette extension.

Évolution visuelle et schéma demandée ensuite : [harmonisation Athlètes FEBACO](athletes-vues-febaco.md). Le champ libre `niveau` des athlètes a été supprimé du modèle et de sa colonne source vide, sur instruction explicite. Les niveaux d'entraîneurs et grades restent préservés. Les descriptions initiales de ce champ ci-dessous sont historiques.

Évolution ultérieure expressément demandée : les nouveaux athlètes utilisent désormais `ATH00001` et suivants ; le seul athlète existant a été renommé en `ATH00001` après vérification de ses dépendances, par écriture ciblée autorisée. Les autres catégories gardent leur génération UUID. Voir [identifiants des athlètes](identifiants-athletes.md). Les mentions de génération UUID et d'absence d'écriture métier ci-dessous décrivent le lot d'audit initial, avant cette nouvelle instruction.

HEAD des références lues : FEBACO `ea348b617ff9484f8289005d600f501ea2b19038`, FEVOCO `46df72e16f381d55030b8ec9389adbaede5aec16`. Les fichiers de travail effectivement lus peuvent aussi contenir leurs travaux locaux ; aucune assimilation à un déploiement publié. Complément performance consulté : FEBACO `docs/audits/vercel-cpu-dashboard-2026-10-17.md`, qui distingue explicitement durée réseau et CPU actif et ne prouve aucun coût global des acteurs. Sécurité : tests d'autorisation des références et implémentation FECOT actuelle ; aucun ancien rôle `federal` ni périmètre absent du schéma FECOT n'est importé.

FECOT est sur main, HEAD `1517431ca3cb786caaa914129bebf779ba6578c7`, avec toute l'application et les travaux territoriaux/auth/acteurs-clubs encore locaux. Empreintes de 216 fichiers et sources d'entrée conservées sous `test-results/actors-audit-20261102/` (hors secrets et sorties). Aucun reset, commit, push ou déploiement prévu. FEBACO/FEVOCO ne sont ni modifiés ni installés/lancés.

Documents examinés : README et CONTEXT des références ; FEBACO `acteurs-implementation.md`, mappings Sheets, médias et licences ; FEVOCO lot V4 acteurs, affiliations, licences, autres acteurs et arbitres ; FECOT README, structure territoriale, environnement, droits et travaux précédents. Code de référence : ActorEditor et acteurs/listes/fiches FEBACO, services et mappings d'affiliations/licences ; FEVOCO identifiants, références, CRUD et panneaux d'affiliations. Les vieux rapports de rôles « federal » ne remplacent pas les droits actuels AUT-SPT de FECOT.

## Écarts et tâches avant implémentation

| ID / priorité | Nature | Attendu / référence | Constat FECOT et conséquence | Correction / critère |
| --- | --- | --- | --- | --- |
| A1 P0 | Erreur | Six listes/fiches et CRUD, FEBACO | `app/(dashboard)/{athletes,coachs,arbitres,officiels,medecins,autres-acteurs}` affiche ModulePending ; aucun service | Raccorder les six familles, chargement et erreur explicites, CRUD sur données isolées |
| A2 P0 | Erreur | En-têtes réels avant mappings, FEVOCO | Dates/passeports diffèrent selon feuille ; autres sans id_national/id_wt ; risque de perte | Mapping explicite par en-tête, PUT partiel conserve champs omis/colonnes supplémentaires, clés immuables |
| A3 P0 | Particularité sportive | FECOT : id_wt, niveau athlète ; pas FIBA/FIVB | Copier les références importerait IDs/valeurs sportives erronés | ID World Taekwondo, niveau existant, références FECOT uniquement ; aucun code basket/volley |
| A4 P0 | Erreur / sécurité | AUT-SPT frais, VIEWER lecture | Routes existantes protégées par proxy mais nouveaux handlers absents | Contrôle frais aussi dans handlers, aucune lecture de fiches avant autorisation, pas de cache de droits |
| A5 P1 | Harmonisation | Listes FEBACO sans KPI, tableau commun, pagination/taille, œil/édition | Aucun écran opérationnel | Réutiliser DataTable, Header, Avatar, Sheet, CompactDateInput, états mobiles et vides |
| A6 P1 | Harmonisation | Formulaires latéraux FEBACO, champs regroupés, validation serveur | Formulaires absents | Identité/coordonnées/passeport/complément selon colonnes présentes ; erreurs par champ, double soumission, confirmation et mise à jour |
| A7 P1 | Erreur / médias | Avatar et document privés, chargement sur consultation | Service de logos seulement | Routes dédiées aux médias référencés, signature/taille/MIME, compensation et aucune URL Drive ouverte injectée |
| A8 P1 | Erreur / performance | Affiliations/licences reliées aux fiches ; FEVOCO filtre par acteur | Sources non raccordées | Sections à la demande, filtre ID/type avant transformation, panne secondaire distincte ; ne pas présenter une panne comme liste vide |
| A9 P1 | Information manquante | Référentiels FECOT utilisables | GRADES, NIVEAUX_COACH, GRADES_ARBITRES, SPECIALITE_MEDECIN, TYPES_AUTRES_ACTEURS vides | Aucun choix inventé ; champs facultatifs vides, valeur historique conservée, référence inconnue nouvelle refusée |
| A10 P1 | Blocage externe | Accès Google du compte applicatif | Acteurs accessible ; Affiliations et Licences HTTP 403 | Implémenter/tester avec source simulée ; recette réelle secondaire bloquée jusqu'au partage approprié |

Suivi : A1–A8 à faire au cadrage ; A9 à traiter sans migration ; A10 bloqué côté accès. Le suivi final sera ajouté après validations, avec distinction entre code, tests isolés et Google réel.

## Schémas réels vérifiés en lecture seule

Acteurs : ATHLETES.id_athlete, COACHS.id_coach, ARBITRES.id_arbitre, OFFICIELS.id_officiel, MEDECINS.id_medecin, AUTRES.id_autre_acteur. Nom/sexe/statut communs. Identifiant international `id_wt` (absent d'AUTRES), jamais id_fiba/fivb. Athlètes : `niveau` libre, pas de FK de grade ni poids/catégorie dans cette feuille. Coachs : `id_niveau`; arbitres : `id_grade_arbitre` et date_affiliation ; médecins : `id_specialite`; autres : `id_type_autre_acteur` et `entite` historique. Variantes physiques exactes de passeport et de dates traitées par le mapping, sans migration des colonnes.

Références : SEXES contient FECOT-SEX-001 MASCULIN, FECOT-SEX-002 FEMININ et FECOT-SEX-003 MIXTE (réservé aux clubs, donc non proposé pour les personnes). GRADES est une liste de ceintures/niveaux actuellement vide ; ne pas inventer une correspondance avec `niveau`. CATEGORIES_AGE et DISCIPLINES sont également vides. Aucune catégorie d'âge basketball calculée.

Relations : ATHLETE/COACH/MEDECIN_AFFILIATIONS relient au club ; OFFICIELS_AFFILIATIONS et AUTRES_AFFILIATIONS ont type/entité ; ARBITRE_AFFECTATIONS n'est pas une affiliation de club. ARBITRES_GRADES et MANDATS sont des historiques distincts. Licences : ATHLETE_LICENCES et ACTEURS_LICENCES avec type d'acteur/cycle et bornes de validité. Une licence n'est ni un simple statut d'acteur ni une affiliation.

Les en-têtes ont été lus via le compte connecté Drive, sans lignes personnelles. Le test d'accès du compte applicatif ne lit que les métadonnées. Aucune valeur de secret ni écriture Google dans cet audit.

## Livraison et suivi des tâches

| Tâche | État final | Preuve / limite |
| --- | --- | --- |
| A1 listes, fiches, création/modification des six catégories | Vérifiée hors production | `components/actors`, six pages, services et routes ; parcours navigateur sur données synthétiques |
| A2 mappings et conservation des données | Vérifiée | Tests des six schémas physiques, alias, colonnes déplacées, PUT partiel et identifiants immuables |
| A3 adaptations taekwondo | Vérifiée dans le code | `id_wt`, sexe FECOT, niveau libre ATHLETES ; aucun FIBA/FIVB ni catégorie inventée |
| A4 autorisations | Vérifiée hors production | 401/403 et panne de la source de sécurité avant lecture ou mutation ; AUT-SPT READ/WRITE frais |
| A5 listes et A6 formulaires | Vérifiées hors production | Composants partagés existants, pagination 10/25/50/100, recherche, filtres, tri, mobile, formulaire latéral et confirmation |
| A7 médias | Code vérifié ; configuration réelle à faire | Upload et lecture privés testés avec Google simulé ; dossiers privés non renseignés, aucun upload réel |
| A8 relations | Lecture implémentée et vérifiée hors production | Onglets distincts, à la demande, filtrés par ID/type ; pas de CRUD des affiliations/licences dans ce lot |
| A9 référentiels vides | Traitée sans invention ; complément externe à faire | Pas de migration ; FK historique conservée ; nouvelle FK inconnue refusée |
| A10 accès des classeurs secondaires | Bloquée extérieurement | 403 Affiliations/Licences pour le compte applicatif ; recette Google secondaire impossible |

Les écritures d'affiliations/licences, les mandats et le raccordement inverse des acteurs aux fiches de clubs ne sont pas implémentés. Ces fonctionnalités ne sont pas annoncées comme vérifiées. Les dossiers de médias privés restent à configurer : deux variables vides et commentées sont préparées dans `.env.local` et `.env.example`. Aucun dossier public de logos n'est réutilisé. Aucun bouton de suppression d'acteur n'est introduit, pour ne pas rompre ses références.

## Architecture et cartographie des appels

- Six `app/(dashboard)/*/page.tsx` utilisent `components/actors/actors-page.tsx`, puis `ActorsClient`. La permission WRITE est calculée côté serveur ; la lecture effective et chaque écriture sont à nouveau autorisées par les handlers. Les contrôles du proxy restent en place, notamment origine et session. FECOT n'expose actuellement aucun champ de périmètre territorial utilisateur supplémentaire dans ce bloc : aucune restriction hypothétique n'est remplacée par un filtre client.
- Liste : GET `/api/actors/{kind}` → `actorsGet` → `listActors` → une lecture batch de la seule feuille de catégorie et une lecture batch de SEXES avec son éventuel référentiel spécifique. Tri nom puis ID ; projection sans coordonnées, numéro de passeport, URL Drive brute ni identifiant de fichier. Recherche, tri, filtres et pagination sont locaux, sans appel Google supplémentaire.
- Fiche : GET `/api/actors/{kind}/{id}` → existence vérifiée sur une lecture fraîche de la catégorie → projection du seul acteur. Aucun chargement d'affiliations, licences ou options d'édition à l'ouverture.
- Formulaire : GET `?references=1` seulement à l'ouverture ; POST ou PUT JSON validé côté serveur ; écriture RAW par colonnes physiques ; relecture fraîche de confirmation ; réponse appliquée localement sans recharger la collection. PATCH est un alias de PUT partiel. Les IDs existants restent inchangés. Les nouveaux IDs sont des chaînes `FECOT-{ATH|COA|ARB|OFF|MED|AUT}-{UUID}` : choix local sans renumérotation ni dépendance au nom, à la ligue ou au numéro de ligne. Aucun format numérique basket importé.
- Affiliations/licences : GET fiche `?section=affiliations|licences` uniquement à la consultation. Existence de l'acteur vérifiée, lecture groupée des feuilles nécessaires, filtre par ID avant réponse et rendu. Licences non-athlètes filtrées aussi par TYPES_ACTEURS.source_donnees ; si ce référentiel ne classe pas l'acteur, erreur explicite plutôt que mélange des catégories. Affectations d'arbitres et historique de grades restent distincts. Les statuts et dates de validité de la source sont affichés, sans les assimiler au statut général de l'acteur.
- Médias : `GET/PUT /api/actors/{kind}/{id}/media/{avatar|passport}`. GET utilise exclusivement le Drive ID lu dans la ligne autorisée, jamais une URL fournie par le client. Métadonnées MIME/taille/trashed, puis binaire lors de la consultation. Les images du tableau sont chargées paresseusement ; le PDF n'est récupéré qu'au clic de téléchargement. Taille maximale 5 Mo, validation de signature JPEG/PNG/WebP ou PDF, réponse privée no-store et nosniff. PUT vérifie un dossier privé, crée sans permission publique, lie par Sheets puis confirme. L'ancien média n'est pas supprimé. En cas de rejet Sheets définitif, suppression compensatoire du nouveau fichier ; résultat incertain : pas de suppression aveugle d'un fichier potentiellement référencé.

## Mappings retenus et absence de migration

| Champ canonique API / formulaire | Colonne physique acceptée |
| --- | --- |
| date_naissance | date_de_naissance ou date_naissance |
| lieu_naissance | lieu_de_naissance ou lieu_naissance, uniquement si présente |
| numero_passeport | numero_passeport ou numéro_passeport |
| date_delivrance_passeport | date_delivrance_passeport ou date_de_delivrance_passeport |
| date_expiration_passeport | date_expiration_passeport ou date_expiration passeport |
| observations | observations ou observation (espace terminal de l'en-tête ignoré) |

Les autres champs gardent leur nom source. Le schéma est lu avant édition ; aucun champ absent n'est ajouté artificiellement. Un alias double ambigu, un ID vide ou dupliqué provoque une erreur de schéma. Les coordonnées de colonne sont calculées par en-tête, jamais par position fixe. Une mise à jour conserve les champs omis et colonnes inconnues ; aucune migration n'est nécessaire. Dates saisies compactes JJMMAAAA ou dates ISO historiques : validation calendaire stricte serveur, stockage ISO, conservation des zéros des chaînes. Nom, sexe et statut sont obligatoires ; national/WT uniques dans leur catégorie ; naissance future et expiration antérieure à la délivrance refusées.

## Coûts et cohérence

Cache serveur de données brutes, jamais de droits : clé `[spreadsheetId, feuilles demandées]`, 30 s pour les acteurs et 300 s pour les référentiels. Les requêtes identiques en cours partagent une promesse. Mutations : source fraîche, écriture, invalidation, relecture fraîche ; compteur de génération empêchant une ancienne lecture de remplir à nouveau le cache. Pas de repli sur un cache périmé en cas de panne source ou d'autorisation. Les réponses HTTP métier et binaires sont privées no-store. Les droits sont vérifiés avant chaque accès, indépendamment du cache de données.

Comptages prouvés par les tests isolés : trois listes athlètes simultanées à froid totalisent deux batchGet (catégorie + SEXES), aucune lecture Drive. Les actions de recherche, taille, filtre et tri ne déclenchent aucune requête supplémentaire dans Chromium. L'ouverture d'une fiche ne lit aucun classeur secondaire. Les écritures n'ont pas de retry automatique ; délais Sheets 15 s et Drive 30 s, retry Google désactivé pour éviter les répétitions cachées. Les soumissions locales sont sérialisées par catégorie ; les doubles clics et confirmations incertaines sont protégés côté formulaire.

Limites : Sheets ne fournit pas de transaction/unicité atomique entre plusieurs instances ; le verrou mémoire ne remplace pas une contrainte distribuée. Les nouveaux UUID réduisent les collisions de clé, mais une attribution simultanée du même ID national sur plusieurs instances reste un risque. La lecture Google porte encore sur une catégorie complète, car Sheets n'offre pas ici de filtre de lignes côté service. Une image affichée nécessite son endpoint privé et sa vérification fraîche ; aucun gain de CPU global ou Vercel n'est déduit de ces contrôles. Le cache d'acteurs peut conserver une valeur de liste 30 s après une écriture externe à cette application ; les fiches et mutations sont fraîches.

## Validation et preuves

La dernière recette Chromium est réussie : `passed: 12`, `errors: []`. Elle vérifie aussi le filtre Sexe, son croisement avec la recherche, le tri accessible sur ordinateur et l'absence d'appels supplémentaires pour ces opérations. Le tri mobile conserve celui du composant commun ; aucune commande de tri mobile nouvelle n'a été inventée.

Référence avant lot : 81 tests existants réussis. Après lot : 98 tests réussis (17 nouveaux tests acteurs), sans écriture réelle. Tests de modèle : six en-têtes réels, zéros initiaux, dates invalides, FK inconnues, référentiels vides, doublons, PUT partiel, clés/médias non modifiables, projection confidentielle. Tests de services/handlers : permissions, panne de sécurité/Google, concurrence, invalidation avec réponse tardive, colonnes déplacées, acteur inconnu, relations filtrées, échec de confirmation, média privé, contenu invalide et dossier public refusé.

Commandes reproductibles :

```powershell
npm.cmd test
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
node --experimental-strip-types scripts/actors-ui-qa.mjs
# Après copie isolée des sources, voir scripts/actors-build-qa.mjs :
node scripts/actors-build-qa.mjs
```

`lint` est le script existant qui lance TypeScript, pas un contrôle ESLint distinct. TypeScript et lint réussis. Premier build normal réussi, sans flags ignorant les erreurs, dans une copie sans `.env` et avec polices locales. Le build final est consigné dans `test-results/actors-audit-20261102/build.json` et `build.log` ; aucune modification de next.config ou de la chaîne de compilation. Avertissement préexistant de racine/lockfile dans la copie isolée conservé dans les logs, pas masqué.

Chromium, données entièrement synthétiques, vrais composants et vrais handlers/services avec frontières Google simulées : 12 parcours (6 catégories × ordinateur 1440 × 1000 / mobile 390 × 844), liste → fiche → modification, création, pagination, recherche, état vide, absence d'actions WRITE en lecture seule, aucun débordement horizontal ni erreur JavaScript. Captures listes/fiches examinées. Les médias et erreurs Google sont testés au niveau API ; aucune preuve de transfert réel Google ni de recette mobile avec un compte de production n'est revendiquée. Les changements rapides sont protégés par AbortController pour listes, fiches, formulaires et sections ; la course cache lecture/écriture dispose d'un test dédié.

Preuves locales ignorées de Git : `test-results/actors-audit-20261102/{before.json,preservation.json,tests-after.log,typescript.log,lint.log,browser.json,actors-*.png,build.json,build.log}` et test d'accès métadonnées `test-results/workbooks-20261102/actors-access-check.json`. Les sources de recette sont conservées dans `tests/actors-*`, `tests/ui/actors-entry.tsx` et `scripts/actors-*-qa.mjs` ; aucune donnée personnelle dans ces nouveaux jeux de test.

## Recette restante et retour arrière ciblé

### Correctif d'ouverture du formulaire (retour utilisateur)

**Ajustement suivant la comparaison Basket :** le passage du bouton en état Ouverture… ne correspondait pas au comportement attendu. Le parcours normal ouvre désormais directement le volet, avec tous ses champs et choix disponibles. `listActors` fournit `editorData` (catégorie, schéma de formulaire et référentiels filtrés pour les personnes), à partir des tables déjà lues pour afficher la liste. Aucun batchGet supplémentaire, aucun chargement des autres catégories. `ActorsClient` transmet ces données à la création et à la modification ; `ActorEditor` initialise et ouvre synchroniquement. Les validations et autorisations serveur restent fraîches lors de chaque mutation. Si les métadonnées ne sont pas disponibles, l'ancien chargement à la demande reste un secours avec erreur explicite, sans inventer de référentiel. Pas de nouveau cache global côté navigateur ; les données préparées sont propres à la catégorie affichée et sont effacées à son changement.

Le comportement précédent décrit ci-dessous (attente sur le bouton avant ouverture) est donc limité à ce secours. La recette commune `scripts/actors-ui-qa.mjs` vérifie maintenant pour les six catégories l'ouverture Ajouter/Modifier sans requête supplémentaire ni bouton Ouverture…, sur ordinateur/mobile. Le test API vérifie les métadonnées FECOT renvoyées et l'exclusion du sexe MIXTE. La recette isolée `actor-editor-stability-qa.mjs` conserve la couverture du mode de secours et de ses erreurs.

Le retour utilisateur précise que l'effet de rechargement apparaît au clic sur Ajouter. Reproduction Chromium avec réponse des référentiels retenue : le volet s'ouvrait avant la réponse, sans champs, puis reconstruisait son formulaire après le GET. Il ne s'agissait pas d'une navigation de page. Le test `node --experimental-strip-types scripts/actor-editor-stability-qa.mjs` échouait sur l'ouverture prématurée du dialog (1 dialog au lieu de 0 pendant la préparation).

`components/actors/actor-editor.tsx` prépare désormais schéma, choix et valeurs avant d'ouvrir le volet, dans la même mise à jour React. Le bouton affiche Ouverture… et est désactivé pendant la requête. En cas d'échec, une alerte est visible à côté du bouton et une nouvelle tentative reste possible ; aucun volet vide n'est ouvert. Le GET reste à la demande, sans préchargement de toutes les options sur les listes, nouveau cache ou modification des contrôles serveur. L'enregistrement et sa confirmation restent inchangés. Le composant commun applique ce comportement aux six catégories, à la création comme à la modification.

La recette ciblée passe sur ordinateur et mobile (`--mobile`) : ouverture différée jusqu'aux champs prêts, absence de navigation, une requête par ouverture, panne puis nouvelle tentative, saisie stable après sélection et rendu du parent, saisie conservée pendant l'écriture et après un rejet 422 simulé. Jeux synthétiques uniquement, aucune écriture Google. Sources : `scripts/actor-editor-stability-qa.mjs` et `tests/ui/actor-editor-entry.tsx`. Logs ignorés : `test-results/actor-editor-stability-{before,after,mobile,typescript}.log`. Le build documenté plus haut précède ce petit correctif ; il n'est pas présenté comme une nouvelle validation de build de celui-ci.

Build final : sortie 0, 157 fichiers applicatifs/configurations vérifiés par empreinte avant/après, 331 468 ms de durée écoulée locale (ce chiffre n'est pas du CPU). Les 208 fichiers de référence non concernés sont inchangés ; seuls les six écrans, README et la documentation d'environnement existants diffèrent des 216 empreintes initiales. Les autres fichiers du lot sont nouveaux. Les fichiers Compétitions, territoriaux, utilisateurs, authentification et les dépendances n'ont pas été modifiés par ce lot.

Fichiers du lot : six `app/(dashboard)/{athletes,coachs,arbitres,officiels,medecins,autres-acteurs}/page.tsx` ; trois handlers sous `app/api/actors/[kind]` ; `components/actors/{actors-page,actors-client,actor-editor}.tsx` ; `lib/actors/{model,service,api,media,relation-labels}.ts` ; `tests/actors-{model.test,api.test,fixture}.ts`, `tests/ui/actors-entry.tsx` ; `scripts/actors-{ui,build}-qa.mjs` ; `.env.example`, deux variables vides dans `.env.local` ; README et les deux documents de ce lot. Les fichiers de référence FEBACO/FEVOCO restent en lecture seule.

Avant toute mise en service, faire partager Affiliations/Licences au compte applicatif avec les droits nécessaires, renseigner deux dossiers privés Drive, compléter les référentiels FECOT par la procédure métier autorisée, puis effectuer une recette autorisée des six catégories avec comptes READ/WRITE. Vérifier les relations historiques par ID, les accès refusés, les fichiers privés et la cohérence après mutation. Cette intervention ne réalise aucun partage, migration, écriture métier Google, push ou déploiement.

Retour arrière local : restaurer seulement les six pages depuis `test-results/actors-audit-20261102/before/*.source`, retirer les nouveaux modules `components/actors`, `lib/actors` et `app/api/actors`, et annuler uniquement les paragraphes de documentation/variables ajoutés par ce lot. Ne pas utiliser de reset/clean : les autres modules et les travaux territoriaux/auth étaient déjà locaux. Aucune donnée n'est à migrer en retour arrière puisque ce lot n'a écrit dans aucun classeur. Si une mise en service ultérieure a créé des acteurs, conserver leurs IDs et médias ; ne pas les effacer par retour de code.
