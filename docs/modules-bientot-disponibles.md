# Pages des modules en attente — FECOT

Évolution autorisée ultérieurement : les deux pages Licences sont activées
selon FEVOCO. Voir [le rapport Licences](licences-fecot.md). Le tableau et les
résultats ci-dessous décrivent la demande initiale. Le bloc Compétitions est
maintenant activé selon le [rapport Compétitions](competitions-fecot.md).
Équipes nationales, activités et documents restent Bientôt disponible ;
Paramètres reste en préparation. La recette actualisée vérifie ces quatre pages.

Demande du 3 novembre 2026 : afficher Coming soon sur toutes les pages des blocs Licences, Compétitions, Administration et Équipes nationales. Cible vérifiée : data/monosport/fecot-managment, application locale sur le port 3000.

Le composant existant `components/dashboard/module-pending.tsx` reçoit une option comingSoon : titre « Bientôt disponible », texte « Ce module sera disponible prochainement. ». Le comportement par défaut reste inchangé pour les pages hors périmètre.

Pages concernées :

| Bloc | URL | Titre de page |
| --- | --- | --- |
| Licences | /licences | Licences — Athlètes |
| Licences | /licences/entourage | Licences — Entourage |
| Compétitions | /competitions | Compétitions |
| Équipes nationales | /equipe-nationale | Équipes nationales |
| Administration | /activites | Activités |
| Administration | /documents | Documents |

Les alias /modules/licences, /modules/competitions et /modules/administration redirigent déjà vers ces destinations ; leur comportement est conservé. Aucun autre sous-écran de ces blocs n'est présent dans les routes applicatives actuelles. Paramètres conserve son écran Module en préparation.

Le layout protégé, les droits, les menus et la navigation ne sont pas retirés. Aucun changement des fiches Acteurs, relations, API ou données : cette demande concerne les pages dédiées des blocs. Aucun chargement métier, écriture Google, commit, push ou déploiement.

Validation : TypeScript réussi. Recette Chromium `node scripts/coming-soon-qa.mjs` : routes réelles rendues dans le layout avec session simulée uniquement dans le banc isolé, six placeholders et contrôle de non-régression Paramètres aux largeurs 1440 et 390, menu Ligues toujours accessible, aucun débordement ni erreur JavaScript. Aucun contournement d'authentification applicatif. Preuves et captures sous test-results/coming-soon/, logs coming-soon-browser.log et coming-soon-typescript.log. Le build normal précédent n'est pas revendiqué comme nouveau build de ce petit lot d'affichage.

Résultat : 14 rendus réussis. Le menu mobile a été ouvert et refermé par Échap. Pendant la première recette, son bouton de fermeture était intercepté par l'en-tête du Sidebar préexistant ; ce point hors périmètre n'a pas été modifié pour mettre les pages en attente.

Fichiers : les six pages du tableau, le composant partagé, tests/ui/coming-soon-entry.tsx, scripts/coming-soon-qa.mjs et ce document. Retour arrière ciblé : retirer comingSoon des six pages, puis l'option du composant si elle n'a plus de consommateur. Les autres modules et leurs données restent inchangés.
