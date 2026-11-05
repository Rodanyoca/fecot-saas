# Identifiants des ententes FECOT

## Périmètre et référence — 2 novembre 2026

Chemin vérifié : `C:/Projets/SNDS-RDC/data/monosport/fecot-managment`. Aucun `AGENTS.md` applicable trouvé. README, schémas, rapport territorial, écritures, lectures, formulaires, utilisateurs et tests de ce dépôt examinés. Aucun autre dépôt modifié. Branche `main`, référence Git `1517431ca3cb786caaa914129bebf779ba6578c7` ; toute l'application était déjà un travail local non commité (README et verrou npm modifiés, app/lib/composants/docs/tests non suivis). Ces travaux sont préservés. Empreintes et sources initiales de 200 fichiers conservées dans `test-results/entente-ids-20261102/`, sans secrets.

Le référentiel documentaire et le snapshot local `tests/data/fecot-territory.json` décrivent les 26 ligues `01` à `26`. Ce snapshot est daté du 13 octobre 2026 : **26 ligues, zéro entente, zéro club**. Une lecture fraîche bornée a ensuite été effectuée le 2 novembre 2026 à 12:04 UTC : **26 ligues, une entente, zéro club**. Neuf appels Sheets en lecture seule ont vérifié les métadonnées, en-têtes et colonnes d'identifiants/références des trois classeurs FECOT configurés (territoire, référentiels, utilisateurs). Pas de lignes utilisateurs, coordonnées ou secrets conservés. `FORMATS_ID`, documenté comme contenant des exemples basketball incohérents, n'est pas utilisé par le code et ses valeurs ne sont pas modifiées. Le format FECOT est défini ici et par la validation serveur.

## Format et calcul

`id_entente = id_ligue + code_entente`, sans séparateur et exclusivement en chaînes. Le code local saisi reste manuel, selon le fonctionnement existant ; aucun compteur ni code attribué implicitement.

Le format local retenu est **deux chiffres**, comme dans la demande `01 + 02 → 0102`. Il n'y a ni conversion numérique, ni suppression des zéros, ni complétion silencieuse : `2`, `002`, un nombre JSON `2`, les signes, décimales, espaces internes et lettres sont refusés. `00` est un code à deux chiffres valide, sous réserve d'unicité. Un ancien code à trois chiffres nécessite une décision explicite de correspondance ; il n'est jamais tronqué.

Le serveur accepte également l'identifiant complet de **la même ligue**, suivi d'exactement deux chiffres : `idLigue="01", codeEntente="0102" → code_entente="02", id_entente="0102"`. Un préfixe étranger (`0202` pour `01`) ou doublé (`010102`) est refusé. Le code local `01` dans la ligue `01` donne `0101`, pas une chaîne vide.

La ligue doit exister et être transmise en texte. Les IDs de ligues actuels ont deux chiffres. Les IDs techniques alphanumériques avec tirets/soulignés des ligues créées par l'application restent acceptés : par exemple `FECOT-LIG-test + 02 → FECOT-LIG-test02`. Ce lot ne change pas le modèle d'identifiant des ligues ou clubs.

`lib/entente-id.ts` est le calcul pur commun au serveur, à l'aperçu et au préparateur. `prepareRecord` valide la ligue contre les données fraîchement relues et vérifie l'unicité locale, y compris lorsqu'une ligne historique stocke déjà le code complet. Il vérifie aussi l'absence d'une clé finale occupée. Les champs techniques `id` et `id_entente` envoyés par le client restent refusés ; l'API ne génère plus d'UUID pour ENTENTES. Les écritures Google restent en mode `RAW`, avec des chaînes.

Le formulaire de création/modification propose la ligue parente, le code et un aperçu en lecture seule. Le parent reste verrouillé lors d'une création depuis une ligue. Pour une ancienne clé, le formulaire distingue l'ID stocké du futur ID calculé, sans annoncer une migration déjà faite.

## Compatibilité et changements de clé

Les lectures gardent **l'identifiant réellement stocké**, jamais une clé reconstruite à la volée. Le mapper normalise uniquement les codes complets non ambigus vers leur code local ; les codes historiques ambigus restent visibles pour examen. Tous les types d'IDs existants sont déjà des chaînes. Les routes, recherches, liens `?id=...`, alias du modèle de vue et relations restent basés sur la clé stockée et encodée dans l'URL.

Une entente historique à clé UUID ou autre reste modifiable sur ses coordonnées, nom, statut et autres champs, si son couple ligue/code est valide et inchangé. La sauvegarde ne renomme ni son ID ni ses enfants. Un code historique invalide doit être arbitré avant une nouvelle écriture ; sa lecture reste possible.

**Un changement de ligue ou de code d'une entente existante est refusé par l'API avec HTTP 409 / `ENTENTE_KEY_MIGRATION_REQUIRED`, avant toute écriture.** Cela s'applique aussi aux ententes déjà au nouveau format et aux ententes sans club actuellement chargé. Le formulaire explique la nécessité de la migration et bloque cette sauvegarde. Il n'existe pas de paramètre client pour contourner ce contrôle. Cette décision évite de prétendre coordonner des références qui peuvent se trouver dans d'autres classeurs.

## Références dépendantes recensées

| Source / consommateur | Référence et traitement |
| --- | --- |
| `ENTENTES` | Clé `id_entente`, parent `id_ligue`, code local `code_entente`. |
| `CLUBS` | FK `id_entente`. La ligue courante du club est déduite via l'entente ; `id_ligue_historique` reste historique, sans réécriture. |
| `territorial-view-model`, `territorial-hierarchy`, fiches et formulaires | Jointures, index, compteurs, recherche et liens utilisent les clés stockées. Aucun renommage partiel à la lecture. |
| Utilisateurs / autorisations actuels | `USERS` et `USER_AUTORISATIONS` n'ont pas de FK d'entente ni de périmètre territorial dans les schémas présents ; droits par blocs. Aucune modification de compte ou de permission. |
| Journal | `type_objet` / `id_objet` peut désigner une entente. Politique historique à arbitrer, pas de remplacement automatique du journal. |
| Acteurs et affiliations | Non intégrés dans cette application selon le rapport initial. Absence dans le code ne prouve pas absence de feuilles externes ou de consommateurs futurs. Inventaire obligatoire avant migration. |

Rechercher aussi les exports, feuilles supplémentaires, affectations d'utilisateurs, filtres enregistrés, caches, intégrations et liens externes. Les contrôles de session et d'autorisation restent frais ; ils ne passent pas par le cache territorial.

## Préparer une correspondance locale

```powershell
node scripts/plan-entente-ids.mjs chemin-snapshot.json test-results/plan-ententes.json
```

Le script lit un fichier local et crée un **nouveau** fichier (refus d'écraser une sortie ou l'entrée). Aucun client Google, aucun secret, aucun accès réseau, aucun mode `--execute`. Code de sortie 2 si un point bloque l'examen, 0 si le plan est entièrement examinable ; `executable` vaut toujours `false`.

L'entrée contient `tables.LIGUES`, `tables.ENTENTES`, `tables.CLUBS` sous forme de grilles, avec en-têtes et cellules en texte. `dependencies` déclare les autres feuilles pertinentes sous la forme `{workbook, sheet, values}`. `inventoryComplete: true` est une attestation humaine de l'inventaire, pas une découverte automatique de tous les classeurs.

Exemple **synthétique**, sans coordonnées ni compte réel :

```json
{
  "inventoryComplete": true,
  "tables": {
    "LIGUES": [["id_ligue"], ["01"], ["02"]],
    "ENTENTES": [["id_entente", "id_ligue", "code_entente"], ["ancienne-cle", "01", "02"]],
    "CLUBS": [["id_club", "id_entente"], ["club-exemple", "ancienne-cle"]]
  },
  "dependencies": []
}
```

Correspondance attendue : `ancienne-cle → 0102` ; les cellules de clé et `CLUBS.id_entente` sont proposées ensemble. Les rapports ne reproduisent que les clés, codes et positions nécessaires, jamais les lignes complètes d'utilisateurs ou leurs coordonnées. Conserver les exports et plans réels hors Git dans un emplacement protégé.

Pour préparer un changement de ligue/code, ajouter par exemple :

```json
"changes": [{"oldId": "ancienne-cle", "idLigue": "02", "codeEntente": "02"}]
```

Le plan devient `ancienne-cle → 0202`, propose aussi `ENTENTES.id_ligue` et toutes les FK déclarées. Il exige systématiquement une revue de la géographie et des périmètres avant d'être retenu : villes de l'entente/des clubs compatibles, affiliations et droits éventuels, ligue dérivée des clubs, historique conservé. Aucun ancien rattachement n'est modifié pour générer le plan.

Le préparateur signale : codes/IDs invalides ou numériques, zéros perdus non récupérables, ligues inconnues/dupliquées, anciennes clés dupliquées, collisions de cibles, cibles déjà occupées (même si un autre déplacement les libérerait), références orphelines, en-têtes ambigus, sources ou changements dupliqués et inventaire incomplet. Une égalité de valeur avec une ancienne clé dans une colonne autre que `id_entente` exige une classification manuelle, notamment dans le journal. Les références encodées dans des listes, formules, JSON ou expressions nécessitent une recherche manuelle complémentaire ; le script ne prétend pas les résoudre.

Le plan exécuté sur le snapshot local est conservé dans `test-results/entente-ids-20261102/local-migration-plan.json` : **correspondance vide**, aucun changement proposé, inventaire non confirmé. Il ne permet aucune conclusion sur les ententes créées depuis le snapshot. Aucun renommage de production effectué.

La lecture fraîche a préparé la correspondance suivante, **non appliquée** :

| Ancien identifiant | Ligue | Code local | Nouvel identifiant proposé |
| --- | --- | --- | --- |
| `FECOT-ENT-0d09376b-2878-47c3-a9fe-c9ccdbf43518` | `01` | `01` | `0101` |

Aucune collision ni FK vers cette clé repérée dans les colonnes examinées des trois classeurs configurés ; aucun club dans le classeur territorial. Le plan reste non exécutable et l'inventaire global non confirmé : les listes encodées, intégrations, autres classeurs et anciennes URLs doivent encore être recensés. La proposition nécessite une cellule de clé dans l'inventaire courant ; ce nombre ne constitue pas une autorisation de renommer cette cellule isolément. Voir `identifiants-ententes-correspondance.json`. L'outil de lecture ponctuelle et le plan complet sans données personnelles restent dans `test-results/entente-ids-20261102/` ; aucune source Google écrite.

## Procédure de migration future, séparément autorisée

1. Arrêter temporairement toutes les écritures concernées, y compris les autres instances, scripts et éditeurs Sheets. Exporter les sources fraîches et les dépendances complètes ; conserver leurs versions/empreintes et sauvegardes sous accès restreint. Ne pas exporter mots de passe, secrets ou données personnelles dans les rapports.
2. Générer le plan, examiner chaque ancien → nouveau et chaque référence. Arbitrer les codes ambigus et collisions sans ajouter automatiquement suffixe, padding ou numéro. Vérifier géographie, comptes, affiliations et journal. Mettre à jour le référentiel documentaire `FORMATS_ID` seulement dans un chantier autorisé et validé.
3. Répéter la transformation sur une copie hors production. Vérifier IDs, unicité ligue/code, absence de FK orpheline, clubs, recherche/fiches, droits et refus. Le script livré ne transforme pas les données et ne remplace pas cette répétition.
4. Pour un seul classeur, concevoir une écriture coordonnée et confirmer toutes les cellules après contrôle des valeurs attendues. Entre plusieurs classeurs, Sheets n'offre pas de transaction commune : prévoir maintenance, ordre, compensation et restauration cohérente de **tous** les classeurs. Ne jamais publier une clé d'entente isolément.
5. Contrôler les versions juste avant écriture, toutes les nouvelles clés et toutes les dépendances après écriture ; conserver une correspondance versionnée pour l'historique et les anciens liens. Invalider les caches territoriaux de toutes les instances et actualiser les fiches ouvertes avant réouverture des écritures.
6. En cas d'échec, restaurer clé, code, parent et références de toutes les sources depuis les sauvegardes correspondantes ; ne pas annuler uniquement ENTENTES. Le retour arrière applicatif seul ne migre pas les données.

## Concurrence et garanties

Les validations serveur utilisent les tables fraîches, et la file `entente-write-queue` sérialise lecture/validation/écriture/confirmation des ententes **dans un processus**. Les droits sont vérifiés après acquisition du tour : aucune autorisation périmée conservée pendant l'attente. Une erreur libère la file, sans retry implicite d'écriture.

Cette file n'est pas distribuée : plusieurs instances ou éditeurs Sheets peuvent encore créer un doublon entre vérification et append. Google Sheets ne fournit pas de contrainte d'unicité transactionnelle pour ce parcours. Pour garantir l'unicité en production, imposer un écrivain exclusif couvrant tous les chemins d'écriture, ou livrer séparément un mécanisme de verrouillage partagé durable. Ce lot n'affirme pas cette garantie entre instances.

## Validation et fichiers

Tests de domaine, API simulée et migration dans `tests/entente-id.test.ts` et `tests/entente-api.test.ts`. Ils couvrent zéros, préfixes, doublons locaux, ligues distinctes, entrées invalides, collision avec clé occupée, refus des IDs client, lecture héritée, conservation des enfants, changements de clé refusés, permissions, panne Google simulée et concurrence locale. Les tests préexistants continuent de couvrir clubs, géographie, dates et authentification.

`scripts/territorial-ui-qa.mjs` vérifie désormais le véritable aperçu `0102`, sa recherche, la normalisation du code `02`, la création d'un club lié, la modification ordinaire et le blocage d'un changement de clé. `FECOT_QA_SKIP_REFERENCE=1` exclut explicitement la comparaison avec un autre dépôt pour ce chantier. Toutes les écritures du navigateur sont en mémoire. Captures dans `test-results/territorial/`, dont `entente-id-mobile.png`.

Commandes : `npm test`, `npm run typecheck`, `npm run lint` (alias existant du contrôle TypeScript), `npm run build` et le test UI sans référence externe. Le build normal est isolé, avec dépendances physiques et sans `.env`, pour préserver le serveur utilisateur. Résultats finaux : **72/72 tests avant, 81/81 après**, TypeScript réussi (couvre aussi l'alias lint), navigateur ordinateur/mobile réussi, build normal réussi en 495 890 ms écoulées avec 146 fichiers applicatifs identiques aux sources finales. Aucun gain CPU runtime n'est déduit de cette durée. Voir [la validation structurée](identifiants-ententes-validation.json).

Application : `lib/entente-id.ts`, `lib/entente-write-queue.ts`, `lib/territorial-domain.ts`, `lib/territorial-api.ts`, `lib/mappers/ententes.ts`, `components/ententes/entente-form-dialog.tsx`. Plan local : `lib/entente-id-migration.ts`, `scripts/plan-entente-ids.mjs`. Aucun changement de compte, secret, classeur, permissions, quota, autre dépôt, push ou déploiement.
