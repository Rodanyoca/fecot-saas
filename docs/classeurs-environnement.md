# Classeurs FECOT — préparation de l'environnement

Préparation du 2 novembre 2026, limitée à `fecot-managment`. Les secrets existants de `.env.local` ont été conservés, sans copie depuis un autre dépôt ni affichage de leurs valeurs. Le contenu initial du fichier a été conservé octet pour octet ; seules les sept variables commentées suivantes ont été ajoutées.

| Classeur FECOT vérifié dans Drive | Variable serveur préparée |
| --- | --- |
| 02_FECOT_ACTEURS | `FECOT_ACTEURS_SPREADSHEET_ID` |
| 03_FECOT_AFFILIATIONS | `FECOT_AFFILIATIONS_SPREADSHEET_ID` |
| 04_FECOT_LICENCE | `FECOT_LICENCES_SPREADSHEET_ID` |
| 05_FECOT_COMPETITIONS | `FECOT_COMPETITIONS_SPREADSHEET_ID` |
| 06_FECOT_EQUIPE_NATIONALE | `FECOT_EQUIPES_NATIONALES_SPREADSHEET_ID` |
| 07_FECOT_ACTIVITES | `FECOT_ACTIVITES_SPREADSHEET_ID` |
| 08_FECOT_DOCUMENTS | `FECOT_DOCUMENTS_SPREADSHEET_ID` |

Les valeurs réelles des IDs de ces classeurs sont renseignées dans `.env.local`, avec les noms des fichiers en commentaire. `.env.example` contient les mêmes noms et explications, valeurs vides. Les variables Licences et Équipes nationales sont volontairement au pluriel, même si leurs noms de fichiers sont au singulier. Ne pas créer d'alias concurrents au prochain raccordement.

## Actif et préparé

Le code actuel utilise déjà `FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID`, `FECOT_REFERENTIELS_SPREADSHEET_ID` et `FECOT_USERS_SPREADSHEET_ID`. L'alias existant `GOOGLE_SHEETS_USERS_SPREADSHEET_ID` reste facultatif. Les paramètres de compte Google, de session et des logos Drive ne sont pas modifiés.

Lors de la préparation initiale, les sept variables étaient réservées aux prochains raccordements. Le lot Acteurs du 2 novembre 2026 utilise maintenant Acteurs, Affiliations et Licences, avec les schémas vérifiés et les droits AUT-SPT existants. Acteurs est désormais accessible au compte applicatif ; Affiliations et Licences renvoient encore 403. Ajouter un ID ne partage pas le fichier. Le [rapport Acteurs](acteurs-audit-2026-11-02.md) détaille les limites de recette réelle.

Les variables `FECOT_ACTOR_AVATARS_FOLDER_ID` et `FECOT_ACTOR_PASSPORTS_FOLDER_ID` sont ajoutées vides et commentées dans `.env.local` et `.env.example`. Les secrets existants sont conservés. Les dossiers doivent être privés, vérifiables par le compte OAuth Drive et distincts des logos publics. Aucun dossier n’a été créé ou partagé et aucune valeur n’est copiée d’une autre fédération. Leur absence bloque explicitement les nouveaux uploads, sans bloquer les fiches.

## Accès constatés

`node scripts/check-workbooks-readonly.mjs` vérifie seulement le titre et les noms de feuilles, avec le compte Google configuré et le scope Sheets en lecture seule. Dix requêtes de métadonnées, délai borné, pas de retry ni lecture de lignes métier, écriture ou modification de partage.

- Référentiels, structure territoriale et utilisateurs : accessibles avec le compte applicatif, titres conformes.
- Les sept nouveaux classeurs : **refus HTTP 403** avec ce compte. Ils sont visibles dans la connexion Drive utilisée pour identifier leurs IDs, mais cela ne prouve pas l'accès du compte de service de l'application.
- Le script termine avec un code non nul tant qu'un accès manque ; le refus n'est ni masqué ni remplacé par un autre classeur.

Accorder l'accès de chaque nouveau classeur à l'adresse déjà configurée dans `GOOGLE_CLIENT_EMAIL`, avec le niveau correspondant aux opérations prévues (lecture ou édition). Aucun partage n'a été changé pour ce lot. Ne pas rendre les classeurs publics, ne pas réutiliser les comptes ou classeurs d'autres fédérations. Relancer ensuite le contrôle en lecture seule avant de raccorder le premier module.

## Vérifications locales

Les sept nouvelles clés sont chargées par le lecteur d'environnement Next.js, présentes une seule fois dans `.env.local` et déclarées dans le modèle. `.env.local` est bien ignoré par Git. Les secrets et IDs déjà configurés sont intacts. Les résultats détaillés de métadonnées, sans valeurs de secrets ni données métier, restent dans `test-results/workbooks-20261102/access-check.json`.

Aucun changement de code métier, droits applicatifs, données, quotas, offre, environnement Vercel, autre dépôt, commit, push ou déploiement. Les IDs de classeurs sont des paramètres serveur : aucun préfixe `NEXT_PUBLIC_`.
