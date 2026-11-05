# Compétitions FECOT — audit et suivi d'implémentation

## Référence et préservation

Intervention demandée dans le texte joint du 4 novembre 2026. Cible réelle :
`C:/Projets/SNDS-RDC/data/monosport/fecot-managment`, aucun lien symbolique.
Branche main, HEAD `1517431ca3cb786caaa914129bebf779ba6578c7`, distant
`Rodanyoca/fecot-saas`. README/package-lock déjà modifiés et application largement
non suivie. Préservation sans reset, clean, commit, push ou déploiement.
Aucun AGENTS.md trouvé dans la cible ou les ancêtres vérifiés.
Les références FEBACO et COC sont consultées uniquement en lecture.
Le fichier `.env.example` annoncé dans README n'existe pas au démarrage de ce lot ;
aucune configuration privée n'est exposée ou remplacée.

FEBACO : README, CONTEXT, cahier-des-charges-competitions,
competitions-snds-implementation (canonique), competitions-consultation-creation,
competition-intervenants-validite, mappings, catalogue, phases, participants,
jeux/résultats, identifiants et composants liste/fiche/formulaires.
COC : README/CONTEXT, modèle V1, T09 segments, T10 performances, T12 droits,
adaptation finale, audit CPU du 30 octobre, politique de résultat.
La dernière livraison locale de référence FECOT compte 146 tests réussis,
TypeScript/lint et build normal réussis ; build très lent sous pression mémoire
(rapport Licences/Saisons). Les validations lourdes seront exécutées séparément.

## Parcours et différences confirmées

FECOT ne possède initialement qu'un ModulePending sur `/competitions` : pas de
service, route API, formulaire ou writer Compétitions. Les droits AUT-SPT existent
déjà pour ce chemin et les API correspondantes. Le modèle d'autorisation FECOT
ne contient pas de périmètre territorial d'utilisateur ; aucun nouveau rôle ou
accès territorial n'est supposé à partir de FEBACO. Toutes les écritures doivent
garder les contrôles frais de FECOT, et non le rôle `federal` de la référence.

Le classeur 05_FECOT_COMPETITIONS est identifié par Drive, puis métadonnées et
en-têtes A1:Z2 des treize onglets sont lus. Quelques sentinelles A3:Z12 des
compétitions/épreuves/participants/résultats ne contiennent aucune donnée.
Cela ne constitue pas une inspection exhaustive de toutes les lignes métier.
Le connecteur propriétaire ne prouve pas l'accès du compte applicatif.

Contrôle supplémentaire en lecture seule avec le compte applicatif : une requête
de métadonnées du seul classeur Compétitions renvoie HTTP 403. Le premier essai
restreint ne donnait aucun statut réseau ; une seule relance hors restriction
confirme 403. Aucun partage ni rôle Google n'a été modifié. L'application réelle
ne pourra donc pas lire ce classeur avant correction explicite de son accès.
`scripts/competitions-source-check.mjs` reproduit ce contrôle sans afficher les
identifiants, secrets ou détails privés d'erreur.

Modèle compatible avec FEBACO : compétition datée directement dans COMPETITIONS,
numero_edition facultatif ; aucune compétition permanente ni table EDITIONS.
Épreuve → phase → groupe facultatif → affectation → unité → combat → résultat.
L'engagement administratif et l'unité sportive sont des lignes différentes.
Les intervenants ne sont pas les engagements d'athlètes. Les qualifications sont
des affectations explicites, jamais une conséquence automatique d'un score.

| Priorité / type | Attendu et source | Constat FECOT / conséquence | Tâche et critère |
| --- | --- | --- | --- |
| P1 interface incomplète | Liste/fiche/formulaires FEBACO | Bientôt disponible uniquement | T01 : mêmes composants de tableau, recherche/filtres/tri/pages/taille, cartes mobiles |
| P0 raccordement | Schémas réels FECOT | Aucun service ni API | T02 : mappings par en-tête, erreurs explicites, sources fraîches aux mutations |
| P0 configuration | Références FECOT | Disciplines, catégories, types/modes/phases/unités, statuts/décisions/distinctions sans valeur dans les plages lues | T03 : contrôle de configuration et blocage ciblé ; aucune valeur injectée |
| P0 mapping | TYPES_COMPETITIONS.nom_type | Le mapping basket attend nom_type_competition | T02 : utiliser nom_type, code_type et format réels |
| P0 référentiel ambigu | TYPES_RESULTATS | Six lignes avec VICTOIRE/DEFAITE/forfait, aucun ID/type/discipline et deux barèmes concurrents | T03 : ne pas utiliser ces lignes pour un calcul ; rapport d'invalidité |
| P1 fonctionnel | Création/édition commune | Aucun writer | T04 : IDs serveur, unicités, relations verrouillées si dépendances, version et confirmation |
| P0 particularité | Athlète FECOT lié au club | Basket engage des équipes inexistantes dans FECOT | T05 : engagement individuel réel et unité distincte ; collectifs/composition à préciser |
| P0 métier | Épreuve homogène | Sexe/âge/poids à contrôler ; ATHLETES n'a ni poids ni grade | T06 : compatibilités vérifiables et manques explicites ; pas de pesée ou grade supposé |
| P1 fonctionnel | Phases/groupes/affectations | Feuilles prêtes mais non raccordées | T07 : mode explicite, parent/épreuve cohérents, qualification manuelle |
| P0 format sportif | Kyorugi ≠ poomsae, WT indiquée par l'utilisateur | MATCHS/RESULTATS ne représentent que deux unités opposées et score_a/b | T08 : combat distinct d'une prestation ; préparer l'extension manquante sans l'appliquer |
| P0 cohérence | Correction résultat et dépendances | Aucun comportement défini | T09 : contrôle qualifications et révision explicite des classements, confirmation atomique |
| P1 fonctionnel | Intervenants/distinctions FEBACO | Schémas présents, aucune interface | T10 : acteurs FECOT et cibles/relations valides, aucune donnée privée inutilisée |
| P0 CPU/sécurité | COC audit CPU et gardes FECOT | Rien de raccordé ; éviter le graphe complet anticipé | T11 : lectures groupées/partagées, onglets à la demande, filtrage avant jointures, droits frais |
| P1 preuves | Recettes réelles et synthétiques distinguées | Aucune preuve Compétitions FECOT | T12 : tests parcours/erreurs/dépendances, ordinateur/mobile, TS/lint/build normal |

## Référentiel observé, limites et décisions

Référentiel 00_FECOT_REFERENTIEL, métadonnées puis plages bornées des onglets
DISCIPLINES, CATEGORIES_COMPETITION, CATEGORIES_AGE, GRADES, TYPES_COMPETITIONS,
TYPES_PHASES, MODES_PHASES, TYPES_UNITES_COMPETITION, TYPES_AFFECTATIONS_PHASES,
TYPES_RESULTATS, STATUTS_RESULTATS, DECISIONS_RESULTATS, TYPES_DISTINCTIONS,
RANKING_COMPETITION et PARAMETRES_SYSTEME. Seules les six lignes invalides de
TYPES_RESULTATS sont présentes dans les 25 premières lignes de ces onglets.
Les IDs ne seront ni inventés, ni copiés du basket, ni tirés de FORMATS_ID.
SAISON/STATUTS_SAISON et SEXES sont déjà raccordés par les lots précédents.

ATHLETES : en-tête réel A1:AE1 relu, aucune donnée nominative copiée. Date de
naissance stockée dans date_de_naissance. Pas de colonne poids ou grade sportif.
CATEGORIES_COMPETITION possède age_min/max, sexe, poids_min/max et
categorie_olympique, mais pas de lien explicite à la discipline.

L'utilisateur désigne le site WT comme référence sportive. La page WT historique
rules-wt/rules.html renvoie 404 ; le PDF WT Poomsae de juin 2024 est inaccessible
au premier accès. Pas de répétition en boucle ni substitution de règles nationales
à celles de WT. Les textes WT actuels sont recherchés par leurs liens officiels
et leurs copies publiées par des fédérations ; sources et règles retenues seront
consignées après lecture, sans inventer les choix d'application nationaux FECOT.

Les points 2/1 et 1/0 des lignes incomplètes ne sont pas un règlement exploitable.
Pas de forfait basket 30–0, quarts-temps, somme de scores, classement automatique
ou qualification automatique. Les règles WT ne déterminent pas seules les
compétitions/grades nationaux, leurs dates, formats et catégories effectivement
retenus par FECOT. Une extension de schéma sera présentée séparément, jamais
créée automatiquement dans Google.

## Suivi des tâches

T01/T04/T07/T09/T10/T11 : implémentées et vérifiées sur données synthétiques.
T02 : mappings vérifiés sur les en-têtes réels et en simulation ; accès applicatif
au classeur bloqué (403). T03 : contrôles vérifiés, alimentation du référentiel réel
à faire séparément. T05/T06 : individuel, âge et sexe vérifiés ; collectif,
pesée et grade limités par les sources manquantes. T08 : kyorugi vérifié,
poomsae vérifié uniquement avec l'extension simulée, non appliquée dans Google.
T12 : 169 tests, TypeScript/lint, recette ordinateur/mobile et build normal réussis.
La configuration des références et les décisions sportives indépendantes
n'empêchent pas l'implémentation des parcours génériques testables.
Médias exclus. Toute écriture de recette reste dans des sources synthétiques.

Le présent rapport sera complété au fil des lots avec fichiers, mappings,
résultats défavorables, preuves, limites et procédure de retour arrière ciblé.

## Sources sportives retenues et limites d'application

L'utilisateur confirme WT comme référence. Le [texte WT kyorugi en vigueur au
1er juin 2026](https://www.worldtaekwondo.org/upload/files/2026/05/9c7b3e13-0f32-4b64-b36b-36ca01747ad3.pdf)
est accessible via son lien actuel publié par Taekwondo Canada. Le [texte WT
poomsae du 30 septembre 2024](https://www.taekwondo.dk/files/Dokumenter/Statisk/Dommer/2025/Poomsae%20Competition%20Rules%20and%20Interpretation%20(In%20force%20as%20of%20September%2030%202024).pdf)
est lu dans sa copie publiée par la fédération danoise ; il s'agit du texte WT,
pas d'une adaptation nationale. Le lien « Poomsae Competition Rules » de la page
canadienne pointait en fait vers le règlement des arbitres : ce document n'est
pas utilisé comme règlement de compétition.

WT kyorugi : articles 4, 6, 7, 16. Âge par année de compétition ; le résultat
d'un système au meilleur de trois manches se distingue des points techniques
d'une manche. Les décisions officielles et cas particuliers restent distincts.
Pas de conversion d'un total de points en victoire, ni de forfait basket.

WT poomsae : articles 4, 7, 15 et 16. Âge par année ; plusieurs systèmes sont
prévus, dont élimination, round-robin et cut-off. Le choix relève du programme
de la compétition. Les notes officielles sont distinctes des scores de combat.
Le total reconnu et libre est sur 10 ; les composantes et départages ne sont
pas déduits d'un seul score. Les passages, compositions et qualifications ne
seront pas fabriqués par le logiciel.

Implémentation sportive retenue : saisie des scores/notes, décisions et rangs
officiels, sans arbitrage automatique. Âge et sexe vérifiables ; faute de source
de pesée/grade, une catégorie qui exige ces contrôles doit signaler le manque.
La structure d'équipe/paire et les feuilles de prestations manquent au schéma
réel ; leurs évolutions seront préparées mais non appliquées en production.

## Lots techniques engagés

- `lib/competitions/model.ts` : treize mappings existants (dont historique
  GROUPES_UNITES conservé séparément), contrats de sections, types, IDs serveur
  FECOT et filtrage par compétition avant jointure. Deux contrats d'extension
  Prestations sont explicitement séparés des feuilles réellement présentes.
- `lib/competitions/fields.ts` : formulaires communs et libellés FECOT. Les états
  administratifs proposés sont des conventions applicatives documentées, jamais
  un barème sportif ou des identifiants copiés du basket.
- `lib/competitions/store.ts` : cache brut par feuille, batch des manques,
  partage des lectures en cours et génération d'invalidation ; références
  invalides signalées. Écritures multi-feuilles par spreadsheets.batchUpdate,
  appendCells (sans écraser une ligne ajoutée concurremment) et updateCells
  ciblées ; relecture de confirmation. Aucun ajout de feuille/colonne.

Le verrou reste local au processus. Google ne fournit pas de transaction
lecture/validation/écriture distribuée avec comparaison de version : une édition
externe concurrente reste une limite à documenter. Les nouveaux IDs ne modifient
aucune ancienne clé et ne sont jamais repris d'un formulaire.

## Raccordement, contrats et fraîcheur

API : GET/POST `/api/competitions`, GET/PUT `/api/competitions/[id]`, GET/POST/PUT
`/api/competitions/[id]/[section]`. La section est une liste fermée ; le PUT enfant
utilise `recordId` et exige la version du DTO. Les champs serveur/parents ne sont
jamais acceptés comme champs libres. `general` est la compétition, pas une table
supplémentaire d'éditions. Réponses privées sans cache HTTP.

`model.ts` est le mapping exact des treize feuilles observées. Les colonnes sont
résolues par leur en-tête, non leur position. Les colonnes inconnues sont
préservées et ne sont ni éditables ni renvoyées. `planner.ts` et `play-plan.ts`
valident un plan complet avant une seule écriture Google, puis `store.ts` relit
toutes les lignes concernées. Les clés historiques restent inchangées. Les
nouveaux codes suivent `FECOT-{entité}-{année}-000001` avec allocation serveur.

L'engagement individuel écrit PARTICIPANTS, UNITES et PHASES_UNITES ensemble.
L'affiliation du même athlète au même club doit couvrir le début de compétition,
avec un statut ACTIF/ACTIVE du référentiel. Une affiliation historique terminée
n'est pas automatiquement assimilée à active. L'âge utilise l'année de début ;
les compétitions traversant deux années demandent un choix d'année explicite
encore absent du schéma. Les grades, GAL WT et pesées ne sont pas vérifiés faute
de source : ceci ne constitue pas une homologation complète WT. Toute catégorie
avec borne de poids est bloquée, aucun poids n'est extrait d'un libellé.

Le mode de phase est explicite : GROUPES exige un groupe ; ELIMINATION_DIRECTE
et AUTRE n'en acceptent pas. Les références doivent porter ces libellés reconnus.
L'affectation initiale utilise INITIAL/ENGAGEMENT/ENGAGEMENT_INITIAL/INSCRIPTION ;
une affectation ultérieure exige une phase source antérieure de la même épreuve.
Un combat source exige un vainqueur officiellement validé. Aucune qualification
n'est automatiquement créée. PHASES_UNITES est canonique, même inactive ; elle
supplante l'appartenance historique GROUPES_UNITES affichée en lecture seule.

Kyorugi : profil exact `WT_KYORUGI_BEST_OF_THREE`. Les champs score_a/b sont les
manches gagnées (0–2). PTF exige 2 manches pour le vainqueur et 0 ou 1 pour l'autre.
RSC/WDR/DSQ/DQB sont des décisions distinctes ; leur code doit commencer le
libellé du référentiel. Pas de conversion de points techniques en manches.
Statuts officiels reconnus : JOUE/OFFICIEL/VALIDE/VALIDE_FEDERATION/HOMOLOGUE/CORRIGE.
Poomsae : profils reconnus/libres explicitement configurés ; note officielle
0–10 et/ou rang/décision séparés, aucun juge ni adversaire fabriqué. Ce périmètre
ne représente pas encore tous les formats WT, notamment les confrontations
poomsae, paires/équipes, composantes des notes ou départages automatiques.

Une correction touchant un résultat vérifie les qualifications dépendantes.
Celles incompatibles doivent d'abord être réexaminées. La remise en révision des
classements doit être confirmée : rang et anciennes métriques sont vidés dans
la même écriture, clés et observations conservées. Pas de recalcul basket.
Le hash de version sert au contrôle d'édition obsolète, pas d'historique immuable.

Cache : données brutes par classeur/onglet, 30 secondes ; référentiels 300 secondes ;
lots des manques compatibles et partage des lectures en cours. Génération par
classeur contre une réponse périmée après invalidation. Toutes les sources
nécessaires à une mutation sont relues fraîches ; droits AUT-SPT frais avant
chaque requête serveur, aucune permission mémorisée dans le cache métier.
Les lectures Acteurs/Clubs/Affiliations réutilisent le cache existant. Aucune
requête Drive ou binaire. Aucun retry automatique en cas d'écriture incertaine.
Le verrou sérialise seulement dans le processus, pas entre instances Vercel.

Client : consultation par onglet, pas de préchargement des résultats ou options
d'acteurs. Les formulaires sont immédiatement ouverts, les options secondaires
chargées ensuite avec annulation des réponses tardives. Recherche locale à
deux caractères pour clubs/acteurs. Tableaux réutilisés (pagination/taille/tri),
sans requête lors de recherche, filtre ou pagination. Les données déjà consultées
restent dans la mémoire de la fiche ; Actualiser ou une mutation vide ce cache
client. Aucun intervalle de rafraîchissement. Un refus serveur efface les données
de la section et son cache. Le contrôle serveur reste obligatoire aux écritures.

## Évolution du classeur préparée, non appliquée

Voir `competitions-schema-propose.json` pour les en-têtes et contrats exacts.
Ce fichier n'est pas un script d'exécution et ne contient aucun ID de production.
FONCTIONS contient des noms mais pas d'identifiants dans la plage lue : les
fonctions sont facultatives, leurs lignes invalides ne deviennent pas des options.

Procédure séparée :
1. Sauvegarder les feuilles et compter les lignes/identifiants existants ; détecter
   doublons, références étrangères et en-têtes manquants avant application.
2. Faire valider les formats FECOT et attribuer de vrais IDs uniques au référentiel.
   Ne pas simplement ajouter des IDs aux deux barèmes contradictoires observés.
3. Ajouter `format_resultat` en fin d'EPREUVES si une sélection par épreuve est
   nécessaire ; conserver toutes les colonnes existantes et ne pas déduire les
   formats des noms. Sinon utiliser le contrat exact TYPES_COMPETITIONS.format.
4. Ajouter les deux feuilles de prestations uniquement après approbation ; aucune
   conversion automatique des anciens MATCHS/RESULTATS. Une éventuelle reprise
   exige une correspondance vérifiée et conserve les clés sources.
5. Valider les métadonnées/en-têtes en lecture seule avec le compte applicatif,
   puis tester sur une copie synthétique avant publication autorisée.

Composition collective, pesée/grade et journal de corrections nécessitent des
contrats supplémentaires approuvés ; ils ne sont pas couverts par une colonne
texte improvisée. Les parties indépendantes restent utilisables après configuration.

## Retour arrière ciblé et vérification après publication

Aucune mutation du schéma réel à annuler dans ce lot. Pour retirer le module,
remettre seulement `/competitions/page.tsx` sur ModulePending et retirer les routes
API/components/lib Compétitions ajoutés par ce lot. Préserver Acteurs, Affiliations,
Licences, le package-lock et les autres travaux non suivis ; aucun reset/clean global.
Les tableaux Google et clés existantes doivent être conservés.

Après une publication ultérieure autorisée : vérifier connexion/droits AUT-SPT,
compte applicatif, liste vide/remplie et erreurs de configuration ; compter les
requêtes par onglet sans écriture de recette en production. Contrôler un compte
lecture seule et la navigation ordinateur/mobile. Toute recette de mutation doit
se faire sur une copie dédiée. Aucune mesure locale n'est un gain CPU Vercel.

## Preuves de validation locale

Commandes reproductibles depuis la cible, sans environnement de production pour
les tests/recettes :

```powershell
node scripts/competitions-validate.mjs
node --experimental-strip-types scripts/competitions-qa.mjs
node --experimental-strip-types scripts/competitions-measure.mjs
node scripts/coming-soon-qa.mjs
node scripts/competitions-build-qa.mjs
# Contrôle Google séparé, métadonnées seulement, scope readonly :
node scripts/competitions-source-check.mjs
```

Les commandes test/TypeScript reproduisent celles de package.json. `lint` y est
un alias de typecheck : aucun ESLint indépendant n'est installé ou prétendu exécuté.
Résultat : 169 tests réussis, dont 23 Compétitions ; référence précédente 146.
Les 23 tests nouveaux couvrent IDs/zéros, parents, catégories et modes explicites,
engagement et affectations atomiques, décisions kyorugi, notes poomsae séparées,
qualifications et correction avec classements en révision, intervenants et cibles,
classeur vide, schéma absent, erreurs source, version obsolète, concurrence locale,
réponse en vol après invalidation et confirmation incertaine. Les anciennes dates
françaises conservent les options d'affiliation. Les droits frais, refus d'accès,
projection sans passeport et injection de champs sont vérifiés côté API.

Chromium local : deux scénarios 1440×1000 et 390×1000, onze assertions de parcours
par scénario ; zéro erreur JavaScript. Composants réels et vrais handlers/services,
seuls Google/auth/navigation Next sont simulés. Création de compétition confirmée,
liste/recherche vide, formulaire immédiat, fiche, engagements/options à la demande,
recherche locale à deux lettres, retour sur onglet déjà consulté, chargement exclusif,
réponse tardive ignorée, édition d'épreuve confirmée, refus 403 sans ancien tableau,
absence de débordement horizontal. Captures ordinateur/mobile examinées.
Les quatre autres pages en attente restent contrôlées séparément. Ceci n'est pas
une recette de la session authentifiée de production ni une preuve de droits Google.

Build final : `next build` normal, code de sortie 0, 611 194 ms (10 min 11 s),
compilation 5,3 min et vérification TypeScript du build 3,1 min. Les routes
Compétitions et API sont générées. Copie isolée existante dans node_modules/.cache,
248 fichiers sources/configurations/tests comparés par SHA-256 et inchangés ;
aucun .env ni credential de production, aucun contrôle TypeScript désactivé,
aucun flag de build alternatif. Le next-env généré par Next est exclu du contrôle
d'immutabilité des sources ; les configurations et sources applicatives sont incluses.
Le TypeScript du build vérifie les sources finales, y compris le refus 2–2 ajouté
après les contrôles TypeScript/lint indépendants. La sortie .next de la session
locale est préservée. L'avertissement Next sur le package-lock parent au dossier
isolé est conservé dans le journal ; aucun changement de turbopack.root pour le masquer.
La recette des quatre pages en attente et du bandeau compte dix vérifications
réussies, zéro erreur JavaScript.

Artefacts locaux, sans données personnelles :
`test-results/competitions/{tests.log,typescript.log,lint.log,validation.json,
results.json,1440-epreuves.png,390-epreuves.png,measures.json,build.log,build.json}`.
Ils sont ignorés par Git ; les scripts et le présent bilan assurent la reproductibilité.

Résultats défavorables conservés dans ce bilan : premier contrôle UI en échec parce
que les titres de cartes étaient des div sans sémantique de titre, corrigé par h2 ;
un test attendait 404 pour une clé étrangère absente alors que le contrat de
validation est 422, attente corrigée sans affaiblir le refus ni l'absence d'écriture.
Les avertissements Node MODULE_TYPELESS_PACKAGE_JSON préexistants restent présents ;
le type du package n'est pas changé dans ce lot. Le 403 Google réel reste non résolu.
Le premier build a été interrompu volontairement après 207 secondes pour ajouter
le refus du score de manches impossible 2–2, y compris hors décision PTF.
Son journal est conservé en `build-interrupted.log/json` ; il ne s'agit pas d'une
erreur de compilation masquée. Le build final reprend les sources corrigées.

## Observations de coût, sans extrapolation Vercel

La référence FECOT était ModulePending : il n'existait aucun parcours métier
Compétitions dont on puisse annoncer honnêtement un gain avant/après. Le script
mesure le parcours implémenté en lecture fraîche et avec cache chaud, sur la même
base synthétique : 100 compétitions, 102 engagements et 102 unités, dont deux de
chaque pour la fiche demandée. Deux échauffements puis cinq paires alternées.
Les réponses sont comparées intégralement et restent identiques.

| Mesure locale finale | Frais | Cache chaud |
| --- | --- | --- |
| Appels values Sheets par requête | 4 | 0 |
| Métadonnées / Drive | 0 / 0 | 0 / 0 |
| Lignes sources relues, références comprises | 729 | 0 |
| Engagements + unités projetés | 4 | 4 |
| Réponse JSON | 6 947 octets | 6 947 octets |
| Durée écoulée médiane (5 mesures) | 24,84 ms | 22,04 ms |
| CPU processus observé (plage) | 0–47 ms | 15–31 ms |

Le CPU Windows est quantifié grossièrement sur ces durées courtes (environ 15 ms) ;
un échantillon à zéro ne signifie pas absence de calcul. La source Google est
simulée : aucune attente réseau réelle ne peut être déduite de ces durées.
Ces mesures attestent l'économie de lectures, pas un gain CPU significatif.
Les tables brutes sont encore parsées à chaque consultation serveur ; une lecture
fraîche parcourt donc aussi les lignes étrangères avant filtrage et projection.

Travail évité prouvé par le code : graphe limité à la section, lectures compatibles
groupées, pas de Drive par ligne, enrichissement et versions limités aux lignes de
la compétition et aux entités de la section, index de libellés/affiliations, aucun
DTO complet d'un onglet non ouvert. Les clubs complets ne sont renvoyés que pour
le sélecteur d'engagement, pas lors d'une consultation. Le navigateur constate
une seule requête par nouvel onglet, aucune pour le tri/recherche locale ou le
retour dans un onglet conservé, et un GET frais après une mutation confirmée.
Pas de test de charge, de métrique payante, ni de gain Vercel annoncé.

## Fichiers du lot

- Entrées : `app/(dashboard)/competitions/page.tsx`, `loading.tsx`, `[id]/page.tsx`,
  trois routes sous `app/api/competitions`.
- UI : `components/competitions/{competitions-page,competitions-client,
  competition-editor}.tsx`, composants partagés existants réutilisés sans modification.
- Serveur/modèle : `lib/competitions/{model,fields,store,rules,planner,play-plan,
  service,mutation,api}.ts`.
- Recettes : `tests/competitions-{model.test,fixture}.ts`, `tests/competitions.test.ts`,
  deux entrées UI dédiées et scripts `competitions-{qa,measure,validate,source-check,
  build-qa}.mjs`.
- Documentation : ce rapport, le contrat JSON proposé et README. La recette et
  documentation Coming soon retirent seulement Compétitions de leur liste en attente.

Aucune modification applicative dans FEBACO/COC ; aucun média, fichier privé,
identifiant métier de production, classeur, partage Google, commit, push ou
déploiement modifié par ce lot.

## Suivi du 503 constaté dans la session locale

Le GET `/api/competitions?fresh=1` retournait un 503 générique avec le préfixe
`[actors] SOURCE_UNAVAILABLE`, parce que le bloc réutilisait le gestionnaire
d'erreurs des acteurs. Reproduction réelle : métadonnées Compétitions lues
avec le compte applicatif et scope readonly → HTTP 403, motif Google `forbidden`.
L'identifiant configuré correspond au classeur FECOT identifié lors de l'audit
(comparaison booléenne, sans afficher la configuration privée). Le refus est
donc un problème d'accès Google confirmé ; la durée HMR/cache du journal n'est
pas une preuve de coût CPU métier ni la cause de ce refus.

Correction locale : `source-error.ts` classe les erreurs aux seules frontières
de lecture Google, en conservant uniquement des codes et messages contrôlés.
`store.ts` indique la variable du classeur concerné. `api.ts` utilise désormais
`[competitions]` et conserve les réponses 401/403 des droits FECOT, les erreurs
métier et WRITE_UNCERTAIN. Pas de réponse brute Google, URL, identifiant de
classeur, compte ou token dans les diagnostics. Pas de retry ni repli vers des
données ou permissions périmées. Aucune modification du bloc Acteurs.

Le test de régression a d'abord échoué : SOURCE_UNAVAILABLE au lieu de
GOOGLE_ACCESS_DENIED ; après correction les 24 tests Compétitions ciblés passent.
Un test de classification couvre en plus API désactivée, quotas, source absente,
authentification Google, timeout et panne, avec des sentinelles de secrets.
Suite complète et TypeScript de cette correction : résultats consignés dans
`test-results/competitions/validation.json` : 171 tests réussis (62,6 s),
TypeScript réussi (77,5 s). Le lint n'est pas relancé séparément ici car il est
exactement un alias du même contrôle TypeScript. Le build normal décrit plus haut
est celui de la livraison précédente, pas une nouvelle preuve de build pour ce
petit correctif de diagnostic ; aucun composant visuel n'est modifié ici.

Action nécessaire pour rétablir le service réel : vérifier le partage du
classeur **05_FECOT_COMPETITIONS** avec le compte de service indiqué par
`GOOGLE_CLIENT_EMAIL` dans l'environnement local. Lecture pour consulter,
Éditeur pour les créations/modifications autorisées. Vérifier également les
restrictions de partage de l'organisation. Le partage n'a pas été modifié par
l'agent. Rejouer `node scripts/competitions-source-check.mjs` jusqu'à READABLE,
puis utiliser Actualiser dans l'interface ; si la configuration privée a changé,
redémarrer le serveur local. Tant que Google répond forbidden, le 503 reste
justifié : le correctif de diagnostic ne confère aucun droit Google.

## Harmonisation visuelle ultérieure

La comparaison détaillée avec les pages et panneaux FEBACO, les écarts corrigés,
les spécificités FECOT conservées et les preuves de rendu sont consignés dans
[Compétitions — interface FEBACO](competitions-interface-febaco.md).
