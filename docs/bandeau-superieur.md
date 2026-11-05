# Bandeau supérieur FECOT

Le lien « Mon compte » est retiré du bandeau, selon la référence FEBACO.
La route personnelle reste disponible ; ses contrôles de sécurité sont inchangés.
Déconnexion conserve son appel POST, la vérification de réponse et son message
d'erreur. Son bouton reprend la variante outline et les classes FEBACO.

Actualiser se trouve uniquement dans le contenu du tableau de bord, sous le
bandeau, à droite de la date de dernière actualisation. Le bouton appelle
router.refresh dans une transition React, sans rechargement complet du document.
Il est désactivé pendant la transition et affiche Actualisation...
Le rendu serveur revérifie les droits avant les lectures. Les caches serveur
existants restent applicables : la date indique l'actualisation de la synthèse,
pas une garantie de relecture physique Google. Elle est formatée en français,
avec le fuseau Africa/Kinshasa explicite pour éviter les écarts d'hydratation.
Une panne complète affiche Actualisation indisponible ; une panne partielle
conserve l'alerte et distingue les compteurs indisponibles de zéro.

Aucun timer, polling, listener focus/visibilitychange ou router.refresh automatique
n'a été trouvé dans app/components/lib lors de cette intervention. Aucun mécanisme
de contrôle des droits n'est supprimé. Aucun gain réseau mesuré n'est annoncé.

Validation : script `scripts/coming-soon-qa.mjs`, sur ordinateur et mobile,
contrôle l'absence du lien Mon compte et d'Actualiser dans le bandeau,
la présence de Déconnexion et l'absence de rechargement spontané.
Il utilise les composants réels dans un navigateur isolé avec session simulée,
sans accès Google. Preuves : `test-results/coming-soon/browser.json`.

## Rapport d'écart et correction — référence FEBACO

Références lues : `../febaco-managment/components/dashboard/header.tsx` et
`../febaco-managment/app/dashboard/page.tsx`. Aucun changement dans FEBACO.

| Écart FECOT avant correction | Attendu FEBACO | Correction |
| --- | --- | --- |
| Actualiser placé dans AccountMenu | Bandeau avec Déconnexion uniquement | Actualiser retiré du bandeau |
| Déconnexion sans bordure, texte masqué sur mobile | Bouton outline, libellé visible | Composant Button et classes de référence |
| Aucune date dans le contenu | Dernière actualisation à gauche | RefreshToolbar sous le bandeau |
| Rechargement complet au clic | Actualisation des données sans recharger le document | Transition et router.refresh, données du tableau serveur |
| Accueil contenu dans un Shell max-w-7xl avec padding sm:p-8 | main space-y-8 p-4 md:p-6 | Enveloppe de l'accueil harmonisée |

Le composant toolbar reprend `flex flex-wrap items-center justify-between gap-3
border-b pb-4`, le texte `text-sm text-muted-foreground` et Button outline.
L'adaptation conserve exclusivement les blocs FECOT raccordés. Elle ne rajoute
pas le bouton aux fiches ni aux modules en préparation.

`scripts/dashboard-qa.mjs` vérifie les positions bandeau/section séparées,
la date, les neuf liens, les états vide/panne partielle et l'appel refresh au clic
avec mise à jour de la date, sur 1440 et 390 pixels. Le routeur est simulé dans
ce contrôle isolé ; aucune navigation authentifiée ni lecture Google réelle
n'est revendiquée. Captures et résultats : `test-results/dashboard/`.

Résultats de ce lot : TypeScript réussi, six scénarios de tableau de bord
et seize vérifications des pages communes réussis, sans erreur console.
Le build normal de la livraison précédente n'a pas été relancé pour ce lot
d'harmonisation. Aucun changement de FEBACO, push ou déploiement.
