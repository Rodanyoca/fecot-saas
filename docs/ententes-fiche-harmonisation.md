# Fiche Entente FECOT — harmonisation FEBACO, 2 novembre 2026

Référence examinée en lecture seule : `febaco-managment/app/dashboard/ententes/[id]/page.tsx`. Seul FECOT est modifié.

La fiche retire la rangée « Voir la ligue parente » / « Ajouter un club », ainsi que ses dépendances au routeur et au formulaire de club. En tête restent Retour à la liste et Modifier (selon les droits). La création d'un club reste accessible dans l'espace Clubs.

Structure harmonisée : informations générales et coordonnées/reconnaissance sur deux colonnes, indicateurs Clubs / Clubs actifs / Clubs inactifs, puis « Clubs de l'entente ». Les colonnes sont ID Club, Club, Sigle, Catégorie, Statut et consultation, avec cartes mobiles et lien « Voir le club » comme dans le basket. Le code local d'entente est conservé, propre au modèle FECOT. Aucun bloc Équipes, compteur d'équipes fictif ou identifiant COC absent du schéma n'est ajouté. L'ancienne colonne Athlètes non intégrée est retirée de ce tableau ; les autres vues et le bloc Acteurs existant ne sont pas modifiés.

Les compteurs utilisent uniquement les clubs rattachés à cette entente. ACTIF/ACTIVE et INACTIF/INACTIVE sont reconnus ; un statut inconnu n'est pas arbitrairement déclaré inactif. Aucun appel réseau, changement de droits ou écriture métier ajouté.

Fichier applicatif : `components/ententes/entente-detail.tsx`. Le scénario territorial existant crée désormais un club depuis la liste Clubs, après avoir vérifié l'absence du bouton sur la fiche Entente. Le contrat de props reste compatible.

Validation : 81/81 tests et TypeScript réussis. Deux recettes Chromium dédiées (1440/390 px) : absence des deux raccourcis, compteurs, alignement des indicateurs sur ordinateur, exclusion des clubs d'une autre entente, recherche par sigle, accès aux clubs, Retour/Modifier et VIEWER, absence de débordement et d'erreurs JavaScript. Captures inspectées. La recette territoriale complète passe également, sans comparaison inter-dépôts (`FECOT_QA_SKIP_REFERENCE=1`). Toutes les données de test et écritures sont isolées en mémoire ; aucun formulaire de production soumis.

Preuves : `test-results/entente-fiche-20261102/`. Reproduire : `npm test`, `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `node scripts/entente-fiche-ui-qa.mjs` et le scénario territorial sans référence externe. Pas de nouveau build de production pour cette adaptation visuelle ; compilation navigateur réelle et TypeScript validés. Aucun push ni déploiement.
