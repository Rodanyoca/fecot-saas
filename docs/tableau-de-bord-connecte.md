# Tableau de bord FECOT — 3 novembre 2026

Périmètre : FECOT uniquement. Référence visuelle lue sans modification :
`../febaco-managment/app/dashboard/page.tsx` et `components/dashboard/analytics.tsx`.
La synthèse générale et les tableaux de répartition reprennent leur structure,
espacements, cartes et composants Table existants. Les règles basket ne sont pas importées.

## Raccordement

L'accueil remplace les cartes de modules provisoires par trois indicateurs
(structures, fiches d'acteurs, fiches d'acteurs actifs) et deux tableaux :
ligues/ententes/clubs ; athlètes/entraîneurs/arbitres/officiels/médecins/autres acteurs.
Les catégories sont des liens vers leurs listes. Licences, compétitions,
équipes nationales, activités et documents restent « Bientôt disponible » ;
aucune de leurs sources n'est consultée par l'accueil.

`app/(dashboard)/page.tsx` vérifie AUT-SPT READ avant de lancer les lectures.
Aucun cache de droits ajouté. Lectures parallèles via `getCachedTerritorialTables`
et un `readActorSheets` groupant les six feuilles du classeur FECOT acteurs.
Les données restent côté serveur ; seuls les compteurs et liens sont rendus.
Aucune lecture de média ou de binaire Drive, ni enrichissement des fiches.

Caches existants réutilisés : territorial 30 secondes, clé incluant les deux
classeurs et tag `fecot-territory` ; acteurs 30 secondes, clé classeur + feuilles,
requêtes identiques en cours partagées. Les mutations existantes invalident ces
caches (tag territorial / `invalidateActorSource`). Les modifications externes
aux classeurs restent soumises à ces délais. Pas de polling ni de fetch client.
À froid, le code territorial prévoit deux batchGet et le groupe acteurs un
batchGet ; ce décompte du code exclut l'authentification et ne constitue pas
une mesure réseau en production ou une mesure CPU Vercel.

## Sens des indicateurs

Les acteurs sont des fiches par catégorie, sans dédoublonnage entre professions.
ACTIF/ACTIVE et INACTIF/INACTIVE sont reconnus après normalisation de casse
et espaces. Tout autre statut, y compris vide, est compté séparément.
Une feuille lisible vide donne zéro. Une source en échec donne Indisponible,
avec alerte ; le bloc indépendant reste affiché. Une feuille manquante ne
devient pas implicitement vide. Un échec du batch acteurs rend ce groupe
indisponible. Aucun repli vers d'anciennes autorisations.

## Validation

- 111 tests réussis, dont trois tests du calcul : vide/panne, catégories et
  statuts, absence de données nominatives dans la synthèse, feuille manquante.
- TypeScript réussi ; `lint` est un alias du contrôle TypeScript dans ce dépôt.
- Chromium isolé : six cas réussis, 1440 et 390 pixels, données synthétiques,
  listes vides et panne territoriale. Deux tableaux, neuf liens, pas de
  débordement de page ; les tableaux défilent horizontalement sur mobile.
- Preuves : `test-results/dashboard-tests.log`,
  `test-results/dashboard/browser.json` et captures associées.
- Aucun accès Google ni écriture métier pendant ces tests. Le navigateur
  authentifié n'est pas disponible : les compteurs réels, les révocations de
  droits et les mutations n'ont pas été testés sur les classeurs de production.
- Build normal réussi (code 0, environ 88 secondes), dans une copie isolée
  sans `.env`, pour préserver le serveur local ; 162 fichiers sources
  contrôlés, inchangés pendant le build. Résultat dans
  `test-results/dashboard/build.json` et journal `build.log`.

Retour arrière ciblé : remettre l'ancien accueil et retirer uniquement
`connected-summary.tsx`, `dashboard-summary.ts` et leurs tests dédiés.
Pas de changement de schéma ni de migration. Aucun push ou déploiement.
