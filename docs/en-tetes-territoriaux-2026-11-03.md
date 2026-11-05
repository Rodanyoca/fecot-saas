# FECOT — en-têtes territoriaux et correction de périmètre

L'utilisateur a confirmé l'URL `http://localhost:3000/ligues`, puis les listes Ententes/Clubs, et la cible FECOT. Le processus local sur le port 3000 appartient à `data/monosport/fecot-managment`. Les interventions immédiatement précédentes avaient visé FEVOCO, nommé dans la demande initiale : elles n'affectaient donc pas ce serveur.

Correction appliquée uniquement aux vues FECOT correspondantes : colonnes explicitement en majuscules dans `components/{ligues,ententes,clubs}/*-client.tsx` et style ciblé sur les th ET leurs boutons de tri. Ce dernier point est nécessaire car les boutons n'héritaient pas de text-transform. Police sans-serif des en-têtes conservée. Aucune modification des données, relations, filtres, tri, pagination, permissions ou formulaires.

Dans `components/clubs/club-detail.tsx`, retrait du seul paragraphe « Personnes liées au club… », conformément à la demande précédente. Le titre Athlètes du club et les sections d'effectifs restent présents.

Les changements FEVOCO de ces deux dernières demandes ont été annulés par comparaison exacte avec la référence des quatre fichiers concernés, sans reset et sans écraser d'autre modification. Les deux scripts QA et le rapport ajoutés par erreur dans FEVOCO ont été retirés. Le diff applicatif FEVOCO est revenu à son état précédent ; l'empreinte préexistante de tsconfig.json est inchangée. Les anciens dossiers de preuves sont conservés, sans suppression des travaux parallèles.

## Vérification

- `node scripts/territorial-headings-qa.mjs` : six contrôles réussis, composants FECOT réels et CSS générée depuis les sources courantes, ordinateur/mobile. Vérification des libellés et du style calculé des boutons de tri, absence de débordement, retrait du paragraphe Club et titre conservé. Requêtes distantes bloquées ; données de recette en mémoire, aucune écriture Google.
- `npm.cmd run typecheck` : réussi.
- Serveur réel : recompilation Turbopack observée. Lecture HTTP 200 du bundle public territorial servi par localhost:3000 : composants LiguesClient/EntentesClient/ClubsClient FECOT, libellés LIGUE/SIGLE/ENTENTE/CLUB en majuscules, style des boutons présent et paragraphe retiré absent. Le nom de fichier du bundle est une preuve ponctuelle de compilation et ne doit pas être codé en dur dans l'application.
- Le connecteur du navigateur utilisateur était indisponible ; aucune recette authentifiée de son onglet n'est revendiquée. La vérification du bundle servi confirme cependant que la correction est livrée par le bon serveur local.

Preuves locales : `test-results/territorial-headings-20261103/` (six listes et deux fiches Club capturées, browser.json), `test-results/territorial-headings-{browser,typescript}.log`. Aucun commit, push, déploiement ou arrêt/redémarrage de serveur.
