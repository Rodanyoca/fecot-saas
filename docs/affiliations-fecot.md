# Affiliations FECOT — audit et adaptation FEBACO

Extension liée au lot [Licences FEVOCO](licences-fecot.md) : le changement
de club/entité d'une affiliation déjà référencée par une licence est refusé.
Les commandes Affiliations/Licences partagent une file locale pour vérifier
cette dépendance fraîche. Clôturer la relation puis en créer une nouvelle ;
aucun renommage d'ancienne affiliation ou de licence n'est réalisé.

Évolution demandée ensuite : ouverture instantanée du formulaire et champ
Club repris de FEBACO, avec résultats à partir de deux caractères. La section
« Ouverture et recherche du club » ci-dessous remplace, pour l'interface
éditable, le chargement des options au clic décrit dans le lot initial.

## Référence et périmètre

Cible vérifiée : `data/monosport/fecot-managment`, main,
HEAD `1517431ca3cb786caaa914129bebf779ba6578c7`. L'application étant essentiellement
non suivie dans Git, les travaux locaux territoriaux, acteurs et tableau de bord
sont conservés. Aucun AGENTS.md trouvé dans les dossiers parents ou dans FECOT.
FEBACO est examiné en lecture seule : `lib/affiliations.ts`,
`components/dashboard/affiliations-panel.tsx`, `app/api/_affiliation-write.ts`,
routes API, tests et `docs/google-sheets-mappings.md`. Les audits Acteurs FECOT
et le rapport CPU FEBACO déjà consultés restent applicables.

Règle donnée par l'utilisateur : **athlète → club**, sans équipe intermédiaire.
L'historique autorise plusieurs clubs successifs, jamais deux affiliations
d'athlète dont les périodes se chevauchent, même à des clubs différents.
Les bornes sont inclusives : un nouveau rattachement commence après la fin
du précédent. Cette règle est vérifiée côté serveur, pas seulement par le formulaire.

## Rapport d'écart et suivi

| Type / priorité | Référence ou attendu | FECOT avant | Correction et critère | État |
| --- | --- | --- | --- | --- |
| Harmonisation P1 | Panneau FEBACO : historique, consultation, ajout, modification en panneau latéral | Tableau brut sans actions dans actors-client | Panneau avec composants existants, dates, statut, actions, mobile et pagination | Vérifié sur source simulée |
| Particularité sportive P0 | FECOT : athlète directement rattaché au club | Source id_club déjà correcte, libellés non enrichis | Club obligatoire, existence serveur, aucun id_equipe accepté | Vérifié |
| Erreur fonctionnelle P1 | Affiliation distincte du statut acteur et de la licence | Pas de CRUD ni validation des périodes | API dédiée, identifiant serveur immuable, périodes valides, unicité et chevauchements | Vérifié |
| Sécurité P0 | AUT-SPT READ / WRITE actuels | Lecture seule gardée, ancien rôle federal FEBACO incompatible | Garde FECOT avant lecture/écriture, vérifiée à chaque requête ; propriété acteur de la relation contrôlée | Vérifié |
| Fiabilité P0 | Écriture confirmée, travaux parallèles préservés | Pas de mutation d'affiliation | RAW par en-tête, édition des seuls champs métier, version SHA-256, relecture, état incertain et absence de retry d'écriture | Vérifié en mémoire |
| Performance P1 | Chargement au besoin, pas de boucle au focus | Relations chargées seulement à l'onglet | Conservation du lazy loading ; options à l'ouverture d'un formulaire, pas d'appel auth/me supplémentaire ni focus/visibility listener | Vérifié |
| Particularité FECOT | Coachs/médecins au club ; officiels à une entité ; autres acteurs avec saison | Tables génériques brutes, variantes de colonnes | Cinq mappings explicites ; arbitres restent Affectations/Grades, sans CRUD inventé | Vérifié |
| Configuration manquante P0 | Statuts/types/fonctions/saisons issus du référentiel FECOT | Feuilles concernées vides | Message explicite, formulaire non enregistrable ; aucun SAF/STR/FON de basket injecté | Bloqué sur données de référence à renseigner séparément |
| Donnée résiduelle P2 | FORMATS_ID propre au taekwondo | Le référentiel contient encore des propositions BKB/FEBACO incohérentes | Ne pas les utiliser ; formats applicatifs documentés, aucune correction de données dans ce lot | Signalé |
| Raccordement inverse P2 | Effectifs dans la fiche club | Page territoriale transmet encore actorData.available=false | Non annoncé comme livré ; futur lot de raccordement inverse, pas de faux zéro ajouté | À faire séparément |

## Schémas réellement vérifiés

Métadonnées et en-têtes lus via le connecteur Google Sheets, sans données
nominatives ni écriture. Sources : **03_FECOT_AFFILIATIONS** et
**00_FECOT_REFERENTIEL**. Variables applicatives :
`FECOT_AFFILIATIONS_SPREADSHEET_ID`, `FECOT_ACTEURS_SPREADSHEET_ID`,
`FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID`, `FECOT_REFERENTIELS_SPREADSHEET_ID`.
Aucune valeur de secret enregistrée dans ce rapport.

| Catégorie | Feuille / identifiant | Champs métier |
| --- | --- | --- |
| Athlètes | ATHLETE_AFFILIATIONS / id_affiliation_athlete | id_athlete, id_club, date_debut, date_fin, id_statut_affiliation, observations |
| Entraîneurs | COACH_AFFILIATIONS / id_affiliation_coach | id_coach, id_club, dates, id_statut_affiliation, observations |
| Médecins | MEDECIN_AFFILIATIONS / id_affiliation_medecin | id_medecin, id_club, dates, id_statut_affiliation, observations |
| Officiels | OFFICIELS_AFFILIATIONS / id_affiliation_officiel | id_officiel, id_fonction, id_type_entite, id_entite, dates, id_statut_affiliation, observations |
| Autres | AUTRES_AFFILIATIONS / id_affiliation | id_autre_acteur, id_saison, id_type_entite, id_entite, dates, statut_affiliation, observations |

Dates stockées en ISO, saisie JJMMAAAA via CompactDateInput, anciennes dates
Google lisibles. Les affiliations anciennes conservent leurs identifiants.
Nouvelles séries : AFA-, AFC-, AFM-, AFO-, AFAUT-, six chiffres max+1,
calculés par le serveur sans renumérotation. Pas de suppression.

STATUTS_AFFILIATION fournit les codes et libellés ; pour AUTRES, le champ
physique `statut_affiliation` reçoit le libellé validé (le schéma ne porte pas
`id_statut_affiliation`). Les libellés ambigus sont refusés. C'est une règle
applicative explicite à conserver lors du futur remplissage du référentiel.
Un statut nommé Terminé/Terminée impose une date de fin. Aucun statut par défaut
inventé. Les chevauchements sont contrôlés indépendamment du statut : aucun
statut d'annulation n'est actuellement configuré pour justifier une exception.

TYPES_STRUCTURES fournit les codes d'entité ; seuls les libellés résolubles
CLUB, ENTENTE, LIGUE, FEDERATION sont proposés. Les types non résolubles ne sont
pas remplacés par une saisie libre. Fonction depuis FONCTION_OFFICIEL, saison
depuis SAISON. Ces quatre référentiels ont été lus sur leurs 1000 lignes
physiques : ils ne contiennent que leurs en-têtes au moment de l'audit.
Les anciennes relations orphelines restent consultables avec identifiant et alerte.

## Parcours et coûts

L'onglet Affiliations utilise GET `/api/affiliations/{kind}/{actorId}`.
Les options sont demandées avec `?options=1`. POST crée, PUT
`/{id}` modifie. L'ancienne lecture brute `actors?...section=affiliations`
reste compatible pour les consommateurs existants. Licences et arbitres
restent sur leur parcours antérieur.

Existence acteur vérifiée sur lecture fraîche ; filtre par acteur avant
enrichissement. Les libellés sont indexés dans les collections d'options, pas
de lecture Google par ligne. La réponse ne contient que les champs d'affiliation,
libellés et empreinte de version, sans contact, passeport ou média d'acteur.

Réutilisation du cache readActorSheets : 30 s affiliations/territoire, 300 s
référentiels, clés classeur + groupe de feuilles, partage des requêtes en cours,
barrière de génération à l'invalidation. Les mutations d'acteurs/affiliations
invalident ces lectures. L'invalidation territoriale expire désormais uniquement
les entrées de ce lecteur associées au classeur territorial, y compris les
requêtes en cours, pour ne pas garder d'options club obsolètes après mutation.
Les mutations relisent toutes les références fraîches avant écriture.

Coûts déduits du code, pas métriques Vercel :
- Historique vide : acteur + affiliations, deux batchGet à froid, sans options.
- Historique non vide : jusqu'à quatre batchGet à froid (acteur, affiliations,
  références groupées, structures groupées), contre deux pour l'ancien tableau
  brut. Ce coût supplémentaire fournit les libellés et anomalies ; ce n'est
  pas un gain réseau revendiqué. À chaud, seule la vérification acteur reste fraîche.
- Écriture : cinq batchGet (acteur, affiliations, références, structures,
  confirmation), plus une écriture append ou batchUpdate. Pas de comparaison
  avant/après possible, le CRUD étant absent avant ce lot.
- Aucun Drive, polling, chargement de binaire ou référentiel d'équipe basket.

Le formulaire s'ouvre immédiatement ; les options suivent si nécessaire.
Le bouton Actualiser permanent de FEBACO n'est pas recopié dans les fiches :
l'instruction antérieure de retirer ces boutons des détails Acteurs est conservée.
Réessayer/Recharger n'apparaît qu'en cas d'erreur, conflit ou écriture incertaine.
AbortController protège les lectures et changements rapides de fiche/onglet ;
les écritures ont un verrou de soumission et les réponses tardives après
démontage sont ignorées. Une confirmation incertaine bloque toute nouvelle
écriture jusqu'à relecture explicite. Un conflit de version propose de recharger
l'historique avec `fresh=1`. Aucun cache d'autorisations n'est ajouté.

## Validation et limites

Fichiers applicatifs : `lib/affiliations/{model,service,api}.ts`,
`app/api/affiliations/[kind]/[actorId]/route.ts` et `[id]/route.ts`,
`components/affiliations/affiliations-panel.tsx`, intégration dans
`components/actors/actors-client.tsx`, crochet ciblé dans
`lib/actors/service.ts` et `lib/territorial-api.ts`.
Tests : `tests/affiliations{.test,-fixture}.ts`, adaptation du mock
`tests/actors-fixture.ts`, contrôle de l'invalidation dans `tests/entente-api.test.ts`,
`tests/ui/affiliations-entry.tsx`, `scripts/affiliations-qa.mjs` et adaptation de
`scripts/actors-ui-qa.mjs`. README et audit Acteurs pointent vers ce rapport.

Tests natifs, recette Chromium et journaux sous `test-results/affiliations*`.
Les écritures des scénarios sont exclusivement en mémoire. Le connecteur
Google a servi uniquement à lire métadonnées, en-têtes et référentiels.
Les résultats finaux des contrôles sont consignés ci-dessous après exécution.

La suite complète comporte 120 tests réussis (référence antérieure : 111),
dont neuf tests Affiliations. La recette dédiée couvre douze scénarios
ordinateur/mobile, cinq catégories affiliables, ajout/modification/consultation,
READ sans actions WRITE, options chargées une fois au besoin, absence d'équipe,
référentiel vide bloquant et panne visible. La recette Acteurs complète couvre
douze parcours liste → fiche → modification et création synthétique, incluant
les six catégories et leurs onglets. Ces recettes utilisent les composants,
handlers et services réels avec frontière Google simulée, sans erreur JavaScript.
Une première tentative de recette isolée a échoué par absence de shim next/link,
puis des sélecteurs trop larges ont rencontré le double DOM mobile/ordinateur
et les deux boutons Fermer. Les corrections concernent le harnais de test ;
les recettes ont ensuite réussi. Une fixture des ententes a également été
complétée pour simuler et vérifier le nouveau crochet d'invalidation territorial.

Contrôles finaux : `npm.cmd test` **120/120**, `npm.cmd run lint` réussi
(alias `typecheck`, sans analyse ESLint distincte), TypeScript réussi.
Les deux recettes Chromium donnent **12 + 12 scénarios réussis**, zéro erreur
JavaScript. Le build Next normal final est réussi, code 0, 169 fichiers sources
vérifiés et inchangés dans la copie isolée, sans `.env` de production et sans
perturber le serveur local. Journal : `test-results/affiliations/build.log`,
résultat : `build.json`. Sa durée finale de 767 secondes est une durée de commande
sur la machine locale, pas du CPU actif de l'application ni une métrique Vercel.
L'avertissement de lockfile extérieur à la racine concerne la copie de build
isolée ; aucun réglage de compilation permissif n'a été ajouté. Les avertissements
Node MODULE_TYPELESS_PACKAGE_JSON du lanceur de tests restent présents.

Avant usage réel : renseigner les référentiels FECOT par une intervention métier
autorisée séparée, confirmer le stockage textuel du statut AUTRES, puis effectuer
une recette READ/WRITE sur un classeur de test distinct. Vérifier acteur → club,
changement de club après clôture, refus de chevauchement, révocation de droit,
références inconnues, panne et confirmation après mutation. Aucun scénario de
création de test dans un classeur de production n'est requis par cette procédure.

La file d'écriture par catégorie et l'empreinte de version protègent les accès
du processus et les modifications déjà visibles lors de la lecture. Google
Sheets ne fournit pas de transaction conditionnelle ici : pas de garantie de
concurrence distribuée entre plusieurs instances ou un éditeur Google modifiant
une cellule entre la dernière lecture et l'écriture. Ne pas annoncer cette garantie.
Pas de migration, écriture de test production, push ou déploiement.

Retour arrière : retirer les routes, panneau et services Affiliations, rétablir
le rendu brut de l'onglet dans actors-client ; retirer uniquement le crochet
d'invalidation territoriale ajouté pour ces options. Les données historiques,
identifiants acteurs, fichiers médias, permissions et tableau de bord ne doivent
pas être restaurés ou renumérotés. Aucun changement de schéma à annuler.

## Incident local : réponse HTML 404 à l'ouverture de l'onglet

Symptôme transmis : GET de la fiche acteur 200, GET des affiliations 404,
puis `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
Les handlers d'affiliation retournent des réponses JSON, y compris pour un
acteur absent ; une page HTML 404 désigne donc une rupture avant leur réponse
métier attendue, et non un référentiel de statuts vide.

Les deux fichiers de routes et leurs exports sont présents ; le build normal
les enregistre. Le manifeste des routes déjà compilées du serveur de développement
ne les contenait pas lors du diagnostic. Ce manifeste est alimenté à la demande :
son absence seule ne prouve pas la cause du 404. Le routage local périmé est la
piste retenue, sans revendiquer une reproduction avec une session de production.

Rechargement ciblé du serveur FECOT par son superviseur Next existant : mise
à jour du timestamp de next.config.mjs, contenu et empreinte SHA-256 inchangés.
Le superviseur conserve son environnement ; changement du PID enfant constaté.
Aucun processus d'un autre dépôt arrêté, aucun cache supprimé. Après relance,
une requête locale sans session reçoit HTTP 401 application/json, conformément
au proxy. Ce contrôle ne prouve pas une réponse 200 avec les droits de l'utilisateur.

La seconde erreur est reproduite dans le vrai panneau avec une réponse synthétique
HTML 404 : le test attend un message contrôlé mais reçoit exactement Unexpected
token avant correction. `readApiJson` dans lib/api/client.ts vérifie désormais
le Content-Type et protège la désérialisation ; le panneau l'utilise pour
l'historique, les options et les écritures. Les erreurs JSON métier restent
inchangées. Une réponse d'écriture non interprétable conserve l'état incertain.

Tests : `tests/api-json.test.ts` (trois scénarios), et scénario HTML 404 ajouté
à `scripts/affiliations-qa.mjs` sur ordinateur/mobile. L'absence de navigateur
authentifié interdit de revendiquer ici une lecture réelle des affiliations
Google avec la session utilisateur. Aucune donnée métier modifiée par ce correctif.

Résultats du correctif : TypeScript réussi, 12 tests ciblés réussis (neuf
Affiliations et trois désérialisation JSON), 14 scénarios Chromium réussis,
sans erreur JavaScript. Preuves : `test-results/affiliations-html-{tests,
typescript,after}.log`. Le build normal antérieur ne remplace pas une recette
authentifiée ; il n'a pas été relancé pour ce correctif limité au traitement
des réponses client. La confirmation du 200 métier dans la session de
l'utilisateur reste demandée séparément.

### Suite : erreur 503 masquée

L'utilisateur signale ensuite Lecture impossible et une ressource HTTP 503,
avec des messages HMR/BFCache et de préchargement. Ces messages console ne
donnent ni l'URL de la ressource 503 ni le corps de sa réponse ; aucune panne
Google, erreur de quota ou cause d'authentification n'est donc affirmée.

Défaut client confirmé par reproduction : le proxy retourne `error` sous forme
de chaîne, alors que le panneau ne lisait que `error.message`. Un test du vrai
panneau avec la réponse 503 du proxy échoue avant correction : il attend
Service d'authentification indisponible et reçoit Lecture impossible.
`apiErrorMessage` traite maintenant les deux formats et affiche le statut HTTP,
dans l'historique, les options et l'enregistrement. Aucun droit, cache de droits,
retry ou quota Google n'est modifié. Aucun contenu HTML brut n'est affiché.

Les deux cas visuels ordinateur/mobile de réponse proxy 503 passent après
correction ; 13 tests ciblés passent, incluant les erreurs chaîne/objet, les
statuts 401/422/503 et les neuf cas métier Affiliations. Preuves dans
`test-results/affiliations-503-{before,after,tests,typescript}.log`.
La raison exacte de la réponse réelle reste attendue via le message désormais
affiché dans la session de l'utilisateur ; masquer le message était un défaut
confirmé, mais le corriger ne constitue pas à lui seul une résolution du 503 source.
TypeScript réussi pour ce lot. Aucun build supplémentaire ni accès Google réel
n'a été lancé pour ce correctif de présentation d'erreurs.
La recette complète a aussi été rejouée : 14 cas réussis et aucune erreur
JavaScript, en plus des deux cas proxy 503. La commande PowerShell avec
redirection stderr remonte un code 1/NativeCommandError à cause de
l'avertissement Node MODULE_TYPELESS_PACKAGE_JSON ; les deux journaux et
rapports JSON indiquent respectivement 2 et 14 cas réussis, errors vide.
Ce résultat défavorable du lanceur est conservé, sans modifier le type du
package ni masquer les avertissements.

## Ouverture et recherche du club — harmonisation complémentaire

L'utilisateur confirme que les affiliations fonctionnent de nouveau, puis
signale deux écarts : chargement du formulaire au clic et club en Select.
Références relues : FEBACO `components/dashboard/affiliations-panel.tsx`
et `components/ui/search-select.tsx`. Dans FEBACO, start ne fait que changer
les états locaux et ouvrir le Sheet ; les références sont préparées à l'onglet.
SearchSelect filtre localement après deux caractères, au maximum 40 résultats.

Corrections FECOT :
- Adaptation du même SearchSelect dans `components/ui/search-select.tsx` :
  mêmes classes, icône, seuil, filtrage français, recherche nom/code, limite 40,
  choix explicite et effacement. Ajout uniquement du lien Label/id et aria-invalid.
- Réutilisation pour `id_club` des athlètes, entraîneurs et médecins. Les
  sélecteurs d'entité, fonction, saison et statut restent ceux de leurs schémas.
- Le GET `?editor=1` fournit historique et options ensemble, après une seule
  vérification d'existence de l'acteur et les contrôles de droits existants.
  Le GET historique standard et `?options=1` restent compatibles.
- Préparation à la consultation de l'onglet, uniquement pour le client éditable.
  Le clic Ajouter/Modifier n'effectue aucune requête, ne déclenche aucun spinner
  et ne remplace aucun champ après ouverture. Le bouton Ajouter est disponible
  après préparation de l'onglet. La lecture seule ne précharge pas le formulaire.
- Aucune requête à la frappe : les clubs sont déjà chargés comme dans FEBACO ;
  c'est leur affichage qui commence à deux caractères, pas une recherche Google.
- Préremplissage de l'édition par l'identifiant du club, historique conservé,
  mêmes validations serveur et mêmes confirmations d'écriture. Une réponse
  obsolète est ignorée via AbortController lors du changement d'onglet/acteur.

Coût du bootstrap à froid, déduit et testé au niveau de l'adaptateur simulé :
quatre lectures groupées (acteur, affiliations, référentiels, territoire),
sans nouvelle lecture d'acteur au clic. Le coût des options est déplacé vers
l'ouverture de l'onglet éditable ; aucun gain CPU Vercel n'est annoncé.
Les caches, fraîcheurs et invalidations restent ceux du lot précédent.

Validation dédiée : test du bootstrap, droits et lectures groupées dans
`tests/affiliations.test.ts` ; script `scripts/affiliations-qa.mjs` adapté pour
vérifier ouverture sans requête, absence de Chargement des options,
zéro résultat avant deux caractères, absence de résultat inconnu,
sélection et préremplissage, sur ordinateur et mobile. Un premier comptage a
détecté le montage automatique du harnais en plus du remontage de test ; le
harnais attend désormais la fin de son premier montage avant de compter.
Preuves : `test-results/affiliations-search-{tests,browser}.log`.
Pas de modification FEBACO, de données Google, de push ou de déploiement.

Résultats de cette harmonisation : **125 tests réussis**, dont dix tests
Affiliations et le bootstrap groupé ; **14 scénarios Chromium réussis**,
zéro erreur JavaScript. `npm.cmd run lint` réussi (alias TypeScript).
Journaux supplémentaires : `affiliations-search-all-tests.log` et
`affiliations-search-typescript.log`. Le build normal n'a pas été relancé pour
ce lot ; les validations couvrent les composants réels et services avec sources
Google simulées. Aucun test d'écriture sur les classeurs de production.

## Panneau Affiliations : contrôles et historique fidèles à FEBACO

Nouvelle demande : remettre le bouton d'actualisation du panneau basket et
retirer recherche/pagination. Elle remplace, uniquement pour Affiliations,
l'instruction antérieure de retirer Actualiser des détails Acteurs.

| Écart constaté | Référence FEBACO | Correction FECOT |
| --- | --- | --- |
| Bouton Actualiser absent | Button outline icon RefreshCw avant Ajouter | Même position et variantes ; icône animée, bouton désactivé pendant la lecture |
| Recherche et pagination de DataTable | Historique intégral sans ces contrôles | DataTable retiré du rendu ; aucune ligne découpée ou masquée |
| Tableau générique ordinateur | Grille des colonnes et actions | Grille md:grid, mêmes espacements, bordures et colonne d'actions |
| Cartes mobiles résumées | Toutes les colonnes en libellé/valeur | Même disposition grid-cols-2 suivie des actions |
| Automatismes de la référence | FEBACO écoute aussi focus/visibilitychange | Seul le clic est repris, sans polling ni relecture au retour du navigateur |

Référence relue sans modification :
`../febaco-managment/components/dashboard/affiliations-panel.tsx`.
L'athlète reste directement lié au club. Colonnes spécifiques FECOT, actions,
permissions, erreurs, confirmations, ouverture instantanée et recherche du
club à deux caractères sont conservées.

Actualiser effectue une seule lecture fresh=1 avec la garde existante.
Le bouton est également proposé en lecture seule ; Ajouter reste réservé
à WRITE. Aucune écriture, nouvelle route ou modification des caches/droits.
Une panne reste une erreur, pas un historique vide.

Validation : le script `scripts/affiliations-qa.mjs` vérifie les positions,
l'absence de recherche/taille/page suivante, les formulaires et la recherche
club conservés. Une réponse est retenue par le harnais : bouton désactivé,
spinner visible, une requête fresh=1, puis treize affiliations affichées sans
pagination sur ordinateur et mobile. Données entièrement synthétiques.
Preuves : `test-results/affiliations-layout-browser.log` et
`test-results/affiliations/all-history-{1440,390}.png`.

Fichiers : `components/affiliations/affiliations-panel.tsx`,
`scripts/affiliations-qa.mjs`, ce rapport. Retour arrière ciblé : rétablir
le rendu DataTable et retirer seulement ce bouton du panneau ; conserver
services, données et formulaires. Aucun push ni déploiement.

Résultats : **16 scénarios Chromium réussis**, zéro erreur JavaScript,
captures ordinateur/mobile examinées ; `npm.cmd run lint` réussi (alias
TypeScript). Journal : `test-results/affiliations-layout-typescript.log`.
Le build normal et la suite métier complète n'ont pas été relancés pour ce
lot de présentation et d'actualisation manuelle ; les services sont inchangés
et la recette traverse les vrais handlers/services avec Google simulé.
