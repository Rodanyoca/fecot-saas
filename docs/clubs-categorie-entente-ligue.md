# Clubs : catégorie, entente et ligue — 2 novembre 2026

Cible uniquement : `data/monosport/fecot-managment`. Comparaison précise en lecture seule avec FEBACO : `components/dashboard/territorial-manager.tsx` (configuration Clubs) et `app/dashboard/clubs/[id]/page.tsx`. Aucun fichier du basket modifié.

La liste FECOT reprend les colonnes du basket : ID, logo, club, **catégorie, entente, ligue**, statut et actions. La version n'est plus une colonne de liste ; elle reste dans la fiche. Les cartes mobiles suivent le même ordre catégorie/entente/ligue. La fiche conserve les blocs d'identité, informations générales, affiliation, indicateurs et acteurs existants ; Affiliation présente catégorie, entente, ligue, puis version et dates.

Entente et ligue affichent leurs **sigles réels** (`sigle_entente`, `sigle_ligue`) résolus depuis les parents courants. Les noms complets restent dans le modèle, la recherche et les infobulles. Un sigle absent est indiqué comme non renseigné, sans inventer d'acronyme ni substituer le nom complet. La catégorie garde son libellé de référentiel.

Les filtres utilisent `id_entente` et `id_ligue` : deux parents de même sigle restent distincts. L'identifiant n'est ajouté au libellé de filtre qu'en cas de sigle identique. Aucun rattachement de secours via `id_ligue_historique`, aucun changement d'identifiant, d'autorisation, de données Google ou de mutation. Les sigles utilisent les tables déjà chargées, sans requête supplémentaire. Le contrat de retour du formulaire conserve les sigles lors de l'actualisation après sauvegarde.

Fichiers : types Club, mapper clubs, `territorial-view-model`, liste/fiches/formulaire Clubs (type de retour seulement pour ce dernier), option d'infobulle de `DetailCard`. Les travaux préexistants sur les acteurs, l'authentification et les identifiants d'ententes sont préservés.

Validation : 81/81 tests, TypeScript sans émission ni modification de tsbuildinfo, test de jointure sur les sigles des parents réels et absence de repli historique pour un orphelin. Chromium 1440 et 390 px sur vrais composants et CSS, sources synthétiques et écritures en mémoire : colonnes/ordre, sigles, noms complets recherchables, filtres avec sigles identiques, liens parents, actions d'écriture/VIEWER et absence de débordement. Captures inspectées dans `test-results/clubs-sigles-20261102/`. Le scénario ne vérifie pas des logos Drive ou données Google réelles. Aucun nouveau build de production exécuté pour cette harmonisation visuelle ; compilation navigateur et TypeScript réussis.

Reproduire : `npm test`, `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `node scripts/clubs-sigles-ui-qa.mjs`. Le script utilise le harnais FECOT existant, sans charger le basket et sans réseau externe. Checklist React du skill `vercel:react-best-practices` : composants existants réutilisés, pas d'effet ou fetch ajouté, données dérivées dans les tables déjà chargées, liens et actions accessibles conservés, types et droits existants préservés.

Aucun commit, push, déploiement ou écriture métier de production pour ce lot. Retour arrière : annuler seulement les changements décrits ici depuis les sources initiales conservées sous `test-results/clubs-sigles-20261102/`, sans restaurer le dépôt globalement.

Complément demandé : les raccourcis « Voir l’entente parente » et « Voir la ligue » sont retirés de la fiche Club. Retour à la liste, Modifier selon les droits, affiliation et blocs acteurs sont conservés. Les scénarios navigateur dédiés et territorial vérifient désormais l'absence de ces deux liens. Recette ordinateur/mobile et TypeScript repassés ; aucun changement de données ou de permissions.
