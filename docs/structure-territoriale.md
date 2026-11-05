# Structure territoriale FECOT

## Dépôts et périmètre

Référence lue uniquement : `../fevoco-cible`, dépôt `Rodanyoca/saas_fevoco`. Cible modifiée : `fecot-cible`, dépôt `Rodanyoca/fecot-saas`. Les instructions FEVOCO et son contexte métier ont été consultés ; FECOT ne possédait pas d’instructions locales propres lors du démarrage de ce lot.

Les composants territoriaux FEVOCO ont été portés, avec leurs tableaux, cartes mobiles, fiches et formulaires latéraux. Leur ordre est conservé :

- Ligue : informations générales, responsables, indicateurs, ententes liées, clubs liés.
- Entente : informations générales, coordonnées et reconnaissance, indicateurs, clubs liés.
- Club : identité et logo, informations générales, affiliation, indicateurs, athlètes, entraîneurs, médecins, officiels.

Les responsables et acteurs ne sont pas inventés. Leurs blocs absents sont signalés explicitement. Aucune équipe ni division n’est ajoutée. Les formulaires ajoutent les champs réellement disponibles dans FECOT mais omis dans la référence : sigles, villes et coordonnées des clubs.

Les liens parent/enfant ouvrent la fiche concernée avec `?id=...`. La création depuis une ligue ou une entente verrouille le parent. Recherches et filtres restent locaux au tableau ; tris accessibles et pagination sont disponibles. Les écritures actualisent les données et les fiches sélectionnées.

## Classeurs réels et adaptation autorisée

Territoire : `01_FECOT_STRUCTURE_TERRITORIALE`, ID `18qYgTrveZrTTSx9g2vYeRUkcLKasP7J5fe54Cm9_ob4`.

Les en-têtes réels ont été lus avant le mapping :

| Feuille | Colonnes |
| --- | --- |
| LIGUES | id_ligue, id_province, nom_ligue, année_creation, date_affiliation_ligue, email, telephone, statut, observations, sigle_ligue |
| ENTENTES | id_entente, id_ligue, id_ville, code_entente, nom_entente, sigle_entente, date_creation, date_reconnaissance, email, telephone, statut, observations |
| CLUBS | id_club, id_ville, code_club, id_ligue_historique, id_entente, nom_club, sigle_club, id_categorie_club, id_sexe, date_creation, date_affiliation, email, telephone, statut, observations, logo_drive_id, logo_drive_url |

Les 26 ligues et leurs IDs `01` à `26` ont été relus et comparés à la lecture initiale : identiques. Aucun enregistrement territorial n’a été créé ou modifié pendant les vérifications.

Le référentiel FECOT `1vRg2U_SnY0uNbhZRFlM9-dAQWsqBTU7v2R_qSyeyeV0` ne contenait pas les quatre listes nécessaires. Après autorisation explicite de l’utilisateur, quatre feuilles y ont été ajoutées en reprenant le modèle FEVOCO :

- PROVINCES : 26 provinces, codes FECOT existants PRO01 à PRO26 conservés.
- VILLES : 36 villes avec leurs provinces ; nouveaux codes FECOT-VIL-001 à FECOT-VIL-036.
- CATEGORIES_CLUB : AMATEUR, PROFESSIONNEL, ELITE, AUTRE ; nouveaux codes FECOT-CAT-001 à FECOT-CAT-004.
- SEXES : MASCULIN, FEMININ, MIXTE ; nouveaux codes FECOT-SEX-001 à FECOT-SEX-003.

Seuls les référentiels géographiques et génériques demandés ont servi de modèle. Aucun compte, club, entente, acteur, catégorie sportive ou règle de compétition FEVOCO n’a été importé. Les autres feuilles FECOT sont conservées. FORMATS_ID contient encore des exemples basketball incohérents et n’est jamais utilisé par le code territorial.

Les nouvelles feuilles ont été relues, y compris la mise en forme des en-têtes, les premières données et les contraintes de largeur. Vérification de présentation du classeur par métadonnées Sheets ; pas de contrôle manuel dans l’interface Google Sheets.

Point de qualité à faire confirmer par FECOT : la ligue existante 22 porte le texte « BAS-UBANGI », tandis que la province géographique PRO22 du modèle de référence est SUD-UBANGI. Son identifiant, son rattachement et son intitulé existants n’ont pas été modifiés.

## Relations et intégrité

Toutes les lectures et écritures utilisent les noms d’en-têtes. Leur position peut changer, y compris avec des colonnes vides intercalées. En-têtes dupliqués ou obligatoires absents, IDs manquants ou dupliqués : refus explicite.

La province vient de LIGUES.id_province, la ligue d’une entente de ENTENTES.id_ligue et le parent d’un club de CLUBS.id_entente. La ligue courante d’un club est calculée depuis son entente. `id_ligue_historique` n’est jamais utilisé comme rattachement de secours et n’est jamais réécrit par les formulaires.

Les nouvelles ententes suivent désormais `id_entente = id_ligue + code_entente` (code local de deux chiffres, texte avec zéros conservés). Les identifiants de ligues et clubs restent FECOT-LIG/CLB suivis d’un UUID serveur. Les anciennes clés d’ententes restent lisibles et ne sont pas renommées par une modification ordinaire. Tout changement de ligue/code d’une entente existante exige une migration coordonnée de sa clé et de ses références ; la mutation isolée est refusée. Voir [le format et la procédure de migration](identifiants-ententes.md). `code_club` reste saisi et unique dans son entente, sans générer la clé du club. Aucun préfixe VOL ou BKB n’est imposé.

Les libellés sont résolus à la lecture depuis les référentiels FECOT ; seuls les IDs sont écrits. Les villes sont proposées selon la province de la ligue et revalidées côté serveur. Un changement de parent ou de province incompatible avec les villes des structures liées est refusé.

Les dates sont saisies en JJMMAAAA, présentées en JJ/MM/AAAA et écrites en YYYY-MM-DD. Dates impossibles, ordre chronologique incohérent, année de création invalide, e-mail invalide et référence inconnue sont refusés côté serveur. Une date vide reste vide. Les téléphones et codes sont écrits en texte RAW pour conserver préfixes et zéros.

## Services, permissions et caches

Une lecture territoriale regroupe LIGUES, ENTENTES et CLUBS en un batch Google ; un second regroupe les quatre référentiels. Aucune requête Sheets par ligne ou indicateur. Cache territorial partagé 30 secondes et déduplication React sur un rendu. Les logos utilisent ce cache pour vérifier l’appartenance au bloc. Les mutations relisent les sources fraîches, invalident immédiatement le tag territorial et les chemins, puis confirment leur résultat par relecture. Les formulaires rafraîchissent la navigation serveur et empêchent une double soumission immédiate.

À la demande complémentaire de l’utilisateur, la connexion FEVOCO a été portée : cookie indépendant fecot_session, mot de passe scrypt, session signée de huit heures, activation temporaire, changement du mot de passe, déconnexion, journal et tentatives pseudonymisées. Aucun secret ni compte n’a été copié. Les pages et API territoriales requièrent AUT-SPT. VIEWER peut lire mais pas écrire ; ADMIN doit disposer d’une autorisation active et datée ; le super-administrateur conserve ses droits. Le serveur contrôle les droits et l’origine des mutations. Les formulaires d’écriture sont masqués en consultation.

Le cache territorial ne couvre jamais les comptes ni les autorisations : leurs lectures restent fraîches. Les autres espaces du socle FECOT restent en préparation et les utilisateurs sans accès sportif arrivent sur Mon compte.

## Logos

Même mécanisme que FEVOCO : Google Drive OAuth avec GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN et le dossier GOOGLE_DRIVE_CLUB_LOGOS_FOLDER_ID, ou son alias existant GOOGLE_DRIVE_CLUBS_FOLDER_ID. Aucun nouveau nom de variable média.

Les formats JPEG/PNG/WebP sont limités à 5 Mo ; la signature du contenu est vérifiée. L’upload enregistre logo_drive_id et logo_drive_url. Le téléchargement est privé et limité aux fichiers référencés par un club FECOT. Un nouveau logo n’efface pas l’ancien fichier Drive. Si la sauvegarde Sheets échoue, le nouveau fichier orphelin est supprimé. Si le club est enregistré mais l’upload échoue, l’interface explique que le club existe déjà et demande de réouvrir sa modification : elle ne recrée pas le club.

## Configuration à renseigner

`.env.example` contient exclusivement les noms réellement utilisés, des valeurs vides et les commentaires obligatoire/facultatif. Aucun autre fichier .env n’a été créé ou modifié.

Renseigner la configuration dans votre environnement, en utilisant les IDs territoriaux/référentiels ci-dessus. Le compte Google de service doit accéder aux classeurs ; le compte OAuth doit accéder au dossier des logos.

Un classeur utilisateurs FECOT doit être désigné séparément avec FECOT_USERS_SPREADSHEET_ID. Préparation sans écriture par défaut :

```powershell
npm.cmd run auth:prepare-workbook
```

Après contrôle du classeur sélectionné, `-- --execute` crée uniquement les quatre feuilles d’authentification absentes et les en-têtes de celles qui sont vides. Aucun compte automatique. Le premier compte se prépare dans un terminal interactif avec l’identité réelle de l’opérateur :

```powershell
npm.cmd run bootstrap:super-admin -- --id FECOT-USR-0001 --nom "Nom réel" --email "adresse-reelle@domaine"
```

Ajouter `--execute` après vérification pour créer le premier super-administrateur, uniquement si USERS est vide. Le mot de passe temporaire s’affiche une seule fois dans votre terminal et doit être changé dans les 24 heures. Ne pas utiliser les comptes FEVOCO.

## Vérifications et limites

- 70 tests métier et d’authentification réussis : validations, droits, sessions, mots de passe, bootstrap et journal ; aucun accès Google dans ces tests.
- Tests territoriaux : en-têtes réordonnés, zéros initiaux, historique conservé, ligue déduite, références et villes, dates, coordonnées, codes uniques et signatures des logos.
- Chromium isolé : liste → recherche → détail → modification, création d’entente dans une ligue puis de club dans cette entente, préchargement, actualisation, consultations, mobile sans débordement. Les créations de test existent uniquement en mémoire du navigateur.
- Captures comparatives des vrais composants FEVOCO et FECOT avec la même lecture FECOT. La référence n’a été ni lancée ni modifiée ; ce contrôle ne remplace pas un test de ses sources de production.
- Serveur Next de production temporaire : login sans erreur navigateur, routes anonymes protégées, écritures anonymes refusées, origine étrangère refusée et 503 explicite sans configuration. Le serveur est arrêté après la vérification.
- TypeScript et build vérifiés. Mise à jour du 14 octobre 2026 : le classeur réel `09_FECOT_USERS` est accessible et ses quatre feuilles sont conformes. Ses comptes, autorisations et journaux sont encore vides. Avec les accords explicites de l’utilisateur, seuls AUTH_SECRET et AUTH_TELEMETRY_HMAC_KEY ont été remplacés dans .env.local par deux secrets aléatoires distincts ; aucune valeur n’est affichée ou documentée. Le contrôle à blanc du premier administrateur avec l’identité fournie réussit, sans écriture distante. Sa création doit être exécutée dans le terminal interactif de l’opérateur, selon le modèle retenu. Connexion réelle, écriture territoriale Google et upload Drive réels restent à valider ensuite.

Les contrôles d’unicité reposent sur une relecture Google Sheets ; Google Sheets ne fournit pas de transaction multi-requête. Deux écritures concurrentes sur plusieurs instances peuvent nécessiter une sérialisation externe si cette concurrence devient un usage réel.

Commandes reproductibles :

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:ui
node scripts/auth-ui-qa.mjs
```

Les tests UI nécessitent Chromium (`npx.cmd playwright install chromium`) et le build pour les styles. Les tests comparatifs supposent FEVOCO présent dans le workspace. Aucun commit ni push automatique de ce lot.

## Inventaire local du lot

Le socle FECOT etait encore non suivi dans Git au debut de ce lot. Le diff stat ci-dessous ne compte donc pas les nouveaux fichiers non suivis ; aucun staging, commit ni push n’a ete effectue.

```text
 README.md         |   41 +-
 package-lock.json | 4753 ++++++++++++++++++++++++++++++++++++++++++++++++++++-
 2 files changed, 4789 insertions(+), 5 deletions(-)
```

```text
 M README.md
 M package-lock.json
?? .env.example
?? .gitignore
?? app/
?? components.json
?? components/
?? docs/
?? lib/
?? next-env.d.ts
?? next.config.mjs
?? package.json
?? postcss.config.mjs
?? proxy.ts
?? public/
?? scripts/
?? tests/
?? tsconfig.json
```

Captures conservees dans `docs/territorial-qa/` : listes, detail, mobile, connexion et comparaison de reference.
