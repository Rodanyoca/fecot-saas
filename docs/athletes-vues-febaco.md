# Athlètes FECOT — niveau et harmonisation FEBACO

Évolution suivante : le composant de fiche a été renommé `components/actors/actor-detail-view.tsx` et réutilisé pour les autres catégories, sans réintroduire de bloc supplémentaire dans Général des athlètes. Voir [les adaptations des autres acteurs](autres-acteurs-vues-febaco.md).

Demande explicite : retirer Niveau des listes et du référentiel Athlètes ; harmoniser la police des tableaux et la fiche avec FEBACO. Cible unique : `data/monosport/fecot-managment`. Référence lue sans modification : FEBACO `app/dashboard/athletes/page.tsx`, `app/dashboard/athletes/[id]/page.tsx`, `components/ui/table.tsx`, `components/dashboard/data-table.tsx`, layout et styles.

## Champ niveau

`actorConfig.athletes` n'a plus d'extra niveau et `actorFields` ne contient plus ce champ. Il disparaît des colonnes et cartes mobiles, des projections API, du formulaire préparé et de la fiche. Une requête d'écriture contenant niveau est refusée ; les lectures de schémas historiques avec cette colonne restent compatibles. Le niveau d'entraîneur `id_niveau`, GRADES et GRADES_ARBITRES ne sont pas modifiés.

Source FECOT vérifiée via Google Sheets : `02_FECOT_ACTEURS`, `ATHLETES`, sheetId 325296645. Lecture CellData de U1:U1001 : uniquement l'en-tête niveau, aucune valeur ou formule. Sur instruction utilisateur, suppression native de cette seule colonne U, sans perte de données. Relecture S1:V2 : passeport_drive_id et passeport_drive_url préservés, niveau absent, 31 colonnes au lieu de 32. Aucun autre classeur, ligne d'athlète, ID, référentiel sportif ou partage modifié. Les écritures applicatives restent repérées par en-tête, indépendamment du déplacement des colonnes. Retour arrière du schéma seulement si demandé : réinsérer U et son en-tête niveau, puis restaurer le code correspondant ; il n'y a aucune valeur métier à restaurer pour ce champ.

## Tableau et fiche

Complément demandé : la colonne Athlètes est désormais Sexe / âge, avec le sexe (M/F) centré au-dessus de l'âge, en reprenant le rendu déjà utilisé pour les autres catégories. Les cartes mobiles des athlètes réutilisent ce même rendu empilé. Date absente/invalide : tiret au lieu d'un âge inventé. Aucune requête réseau supplémentaire. Recette ciblée `node --experimental-strip-types scripts/actors-ui-qa.mjs --athletes-only`, avec contrôle de la superposition et du centrage des deux lignes.

La famille est déjà Geist comme dans FEBACO. Le problème d'en-tête venait des classes monospace des colonnes d'identifiants, appliquées aussi aux th par le tableau commun. Le tableau Athlètes impose maintenant font-sans sur les th, en conservant les nombres/IDs monospace dans les cellules appropriées. Casse, espacement et graisse suivent les primitives communes déjà identiques à FEBACO. Pas de changement global aux tableaux territoriaux ou aux autres catégories.

La fiche Athlètes reprend l'ordre FEBACO : Retour/Modifier, carte de profil (avatar 80 px, nom 2xl gras, action Ajouter la photo), puis trois onglets de largeur égale Général, Affiliations, Licence. Général utilise les DetailCard existantes en grille deux colonnes dès md : Identité, Contact, Identifiants, Observations, avec les icônes correspondantes. ID WT remplace ID FIBA. Aucune catégorie d'âge basket n'est inventée. Les observations affichent la vraie valeur FECOT lorsqu'elle existe. Sur demande complémentaire, Général contient exactement ces quatre blocs, comme FEBACO. Les cartes Passeport et Document de passeport sont retirées de cet onglet. Le modèle, les données et les formulaires de passeport ne sont pas supprimés par ce changement d'affichage.

Les mécanismes existants de photo et téléchargement privés, droits WRITE, confirmations, erreurs et incertitude d'écriture sont conservés. Le choix d'une photo passe par le bouton du profil ; aucune requête binaire anticipée. Affiliations et licences restent chargées à leur consultation, avec annulation des réponses dépassées et alertes en cas de panne. Navigation clavier des onglets : flèches, Home/End. Les fiches des autres catégories ne sont pas remaniées.

## Validation

Fichiers applicatifs : `lib/actors/model.ts`, `components/actors/actors-client.tsx` et le nouveau `components/actors/athlete-detail-view.tsx`. Tests : `tests/actors-model.test.ts`, `scripts/actors-ui-qa.mjs`. Les styles de la recette navigateur sont générés depuis les sources actuelles avec le même PostCSS/Tailwind que l'application ; ils ne dépendent plus d'une ancienne sortie .next. Les positions et largeurs égales des trois onglets sont contrôlées, en plus de l'examen des captures.

`npm.cmd test` : 102 tests réussis. Nouveau test de contrat : absence de niveau dans les projections et mutations, compatibilité de lecture d'un ancien schéma et préservation d'id_niveau des entraîneurs. `npx.cmd tsc --noEmit --incremental false` : réussi. La recette `scripts/actors-ui-qa.mjs` contrôle aussi l'absence de la colonne, la police des en-têtes, les sections et onglets de la fiche et les parcours des six catégories aux deux tailles. Les captures et résultats sont sous `test-results/actors-audit-20261102/` et les logs spécifiques sous `test-results/athlete-view-*`.

Pas de push ni déploiement ; seul le retrait autorisé de la colonne vide a été appliqué au classeur réel. Les tests de création/modification restent synthétiques et en mémoire. Le build normal du rapport initial précède cette harmonisation ; aucun nouveau résultat de build n'est revendiqué ici.
