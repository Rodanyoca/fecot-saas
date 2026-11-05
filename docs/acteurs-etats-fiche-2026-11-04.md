# Ouverture des fiches acteurs — 4 novembre 2026

Référence consultée en lecture seule : FEBACO,
`app/dashboard/athletes/[id]/page.tsx`, branches de chargement et fiche absente.
FECOT : `components/actors/actors-client.tsx` affichait le message de chargement
dans la branche du tableau : liste et attente étaient visibles simultanément.
Le test navigateur avec réponse retenue a échoué avant correction : recherche
de liste encore présente (1 élément au lieu de 0).

Correction : branches exclusives chargement, erreur et fiche. L'erreur de fiche
est distincte de celle de liste ; retour et nouvelle tentative sont proposés.
Le retour pendant l'attente annule la requête et les réponses annulées ne peuvent
réouvrir une fiche. Le changement de catégorie réinitialise les états de fiche.
Le composant commun applique cette correction aux six catégories, sans changer
les routes, permissions, données, mutations ou ajouter de requête.

Validation : `scripts/actors-ui-qa.mjs` retient la réponse réelle du handler sur
données synthétiques et vérifie l'absence de tableau, de création et d'onglet
pendant l'attente. Il simule aussi une erreur 503 et le retour à la liste,
puis vérifie fiche, modification, création et permissions aux largeurs 1440/390.
Premier passage ciblé athlètes après correction : 2 scénarios réussis, sans
erreur JavaScript. Recette complète finale : 12 scénarios réussis (six catégories
sur ordinateur/mobile), sans erreur JavaScript. `npm.cmd run lint` (alias
TypeScript) et `git diff --check` réussis ; seul l'avertissement préexistant
LF/CRLF du README demeure. Build non relancé pour ce correctif d'affichage.
Preuve navigateur : `test-results/actors-audit-20261102/browser.json`.
Les sources Google sont simulées ; aucune écriture de test
en production ni session authentifiée réelle n'est utilisée.

Fichiers du lot : composant commun, script de recette et ce rapport. Aucun
changement de FEBACO, commit, push ou déploiement. Retour arrière : retirer
uniquement les branches de fiche et leur état dédiés de ce lot, en conservant
les raccordements Licences et Affiliations et les travaux parallèles.

## Vérification de l'onglet réel après signalement persistant

Le 4 novembre, contrôle natif de l'onglet Edge à `http://localhost:3000/athletes` :
le défaut a été reproduit visuellement (tableau, Ajouter et chargement simultanés).
Le serveur du port 3000 est bien le Next de FECOT. Les manifestes compilés des
six catégories pointaient déjà sur les branches exclusives corrigées, mais
l'onglet conservait l'ancien code en mémoire. Après rechargement complet
Ctrl+Maj+R, un nouveau clic affiche uniquement l'en-tête Chargement, le message
et le retour, avec navigation conservée et sans tableau ni Ajouter.
Cette observation confirme que la première validation isolée ne prouvait pas
la mise à jour de l'onglet utilisateur. Aucun autre changement applicatif,
redémarrage serveur ou effacement de données navigateur n'a été nécessaire.
La vérification réelle se limite à la lecture d'une fiche ; aucune mutation.
Les captures natives ne sont pas enregistrées dans le dépôt pour ne pas
conserver les données personnelles affichées.
