# Ligues : sigle et tableaux liés — 2 novembre 2026

Cible : FECOT uniquement. Référence FEBACO consultée en lecture seule : configuration Ligues de `components/dashboard/territorial-manager.tsx`. La colonne Sigle est placée après Ligue, avant Province. Le sigle réel, déjà mappé depuis `sigle_ligue`, est également affiché sur les cartes mobiles et dans les informations générales de la fiche. Aucun acronyme inventé ; absence indiquée par « Non renseigné ».

Selon la correction explicite de la demande, les actions de consultation ont été retirées des tableaux Ententes liées et Clubs liés de la fiche Ligue : suppression des deux `detailHref`, donc suppression automatique de la colonne Actions et des boutons associés. Les données, recherches, tris, compteurs et paginations sont conservés. L'accès à la fiche d'une ligue depuis la liste principale reste présent ; aucune suppression globale des parcours Ententes/Clubs ni changement de droits.

Fichiers applicatifs : `components/ligues/ligues-client.tsx`, `ligue-detail.tsx`, et `ligue-form-dialog.tsx` (ajout du sigle au type de retour de sauvegarde). Aucun mapping source, classeur ou autre dépôt modifié.

Validation : 81/81 tests et TypeScript réussis. `node scripts/ligues-sigles-ui-qa.mjs` vérifie les vrais composants et CSS sur 1440 et 390 px avec données synthétiques, réseau externe bloqué et mutations uniquement en mémoire : colonne/sigle, recherche par sigle, données liées visibles, absence de colonne Actions et de liens de consultation dans les deux tableaux, droits VIEWER, absence de débordement et d'erreurs JavaScript. Un premier sélecteur du test confondait l'indicateur et le tableau « Ententes liées » ; il a été précisé, sans modification applicative supplémentaire. Captures et rapport dans `test-results/ligues-sigles-20261102/`, liste ordinateur inspectée visuellement.

Pas de nouveau build de production pour cette correction visuelle ; compilation navigateur et contrôle TypeScript réalisés. Aucun appel Google, écriture métier, commit, push ou déploiement.
