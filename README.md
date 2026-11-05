# FECOT - Federation congolaise de taekwondo

Application Next.js avec le bloc territorial porté depuis FEVOCO : ligues, ententes et clubs, listes, fiches, formulaires latéraux, recherches, filtres, tris, pagination et logos Drive. Connexion, activation, sessions et droits AUT-SPT également portés à la demande de l’utilisateur.

## Demarrage

Les pages Licences des athlètes et de l'entourage sont désormais raccordées
aux feuilles FECOT, selon la référence FEVOCO. Elles remplacent leurs écrans
Bientôt disponible. Voir [l'audit, les règles et les validations](docs/licences-fecot.md).

Les onglets Affiliations disposent d'un historique et de formulaires adaptés
au taekwondo (athlète directement lié au club). Les référentiels vides bloquent
explicitement la saisie : [audit, mappings et limites](docs/affiliations-fecot.md).

Le tableau de bord présente uniquement les indicateurs des structures
territoriales et des acteurs raccordés, selon la présentation FEBACO.
Voir [le périmètre et les validations](docs/tableau-de-bord-connecte.md).

```powershell
npm.cmd install
npm.cmd run dev
```

Ouvrir http://localhost:3000. Si le port est occupe, Next.js indique le port disponible.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd start
```

## Configuration et périmètre

Renseigner les variables décrites dans [.env.example](.env.example) dans votre environnement ou votre fichier `.env.local`. Les valeurs du modèle sont volontairement vides. Aucun secret ni compte d’un autre dépôt n’est réutilisé.

Les variables des sept prochains classeurs sont préparées et commentées : [configuration, état des accès et étapes de raccordement](docs/classeurs-environnement.md). Elles ne rendent pas les modules automatiquement fonctionnels.

La connexion exige un classeur utilisateurs FECOT, deux secrets indépendants et les accès Google. Le bloc territorial exige son classeur et le référentiel FECOT ; les logos nécessitent la configuration OAuth Drive. Sans configuration, l’application refuse l’accès et affiche une indisponibilité explicite.

Voir [le rapport et le guide de configuration](docs/structure-territoriale.md) pour les IDs des deux classeurs FECOT vérifiés, le modèle des données, la préparation du classeur utilisateurs et la création du premier administrateur.

Format des ententes : [calcul ligue + code local, compatibilité et préparation de migration](docs/identifiants-ententes.md). Les nouvelles ententes utilisent par exemple `01` + `02` → `0102` ; les anciennes clés ne sont pas renommées sans migration de leurs références.

Le bloc Acteurs dispose de listes, fiches et formulaires pour les six catégories, avec médias privés, affiliations et historiques de licences à la demande. Les pages Licences sont activées ; leur utilisation en écriture nécessite les référentiels FECOT décrits dans le rapport Licences. Le raccordement inverse des acteurs aux fiches territoriales reste en préparation. Compétitions dispose désormais des parcours individuels documentés dans le [rapport Compétitions](docs/competitions-fecot.md) ; les référentiels réels incomplets doivent être configurés avant utilisation. Le poomsae attend les feuilles proposées, sans migration automatique. Équipes nationales, activités et documents restent en préparation. Aucun jeu de données métier fictif n’est utilisé dans l’application, aucune équipe ou division n’est ajoutée. Aucun logo officiel FECOT n’a été fourni ; la marque reste textuelle. Consulter le [rapport Acteurs](docs/acteurs-audit-2026-11-02.md) pour les mappings, validations et limites Google restantes.

## Vérifications

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:ui
node scripts/auth-ui-qa.mjs
```

Les tests UI utilisent Chromium local : `npx.cmd playwright install chromium` si nécessaire. Le test territorial est isolé : il part d’une lecture réelle des 26 ligues FECOT et conserve toutes les écritures de test en mémoire. Les comparaisons supposent le dépôt FEVOCO présent dans le même workspace.
