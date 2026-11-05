# Navigation FECOT — écarts avec FEVOCO

Analyse du 14 octobre 2026, avant modification : lecture des composants FEVOCO et FECOT, captures FECOT sur ordinateur et mobile. Les captures initiales utilisent un navigateur isolé ; le fichier du logo n’y était pas servi.

| Élément | FECOT avant | Référence et correction |
| --- | --- | --- |
| Organisation | Menu à plat | Groupes FEVOCO dans le même ordre |
| Pages | Entrées génériques et pages manquantes | Six pages Acteurs, deux pages Licences, Compétitions, Équipes nationales, Activités, Documents, Paramètres |
| Libellés | Accueil, Structures | Tableau de bord, Structure territoriale et textes FEVOCO |
| Marque | Bandeau 80 px et logo rectangulaire | Bandeau 64 px, cercle 40 px, ligne tricolore |
| Liens | Sélection bleue et icônes différentes | Sélection dorée, mêmes icônes, survol, focus, espacements |
| Groupes | Aucun repli | Groupes repliables avec chevrons |
| Réduction | Largeur fixe | Largeur 256/64 px, préférence locale et infobulles |
| Mobile | Superposition manuelle | Panneau modal Radix, fermeture et gestion du focus |
| En-tête | Hauteur et bordure différentes | En-tête FEVOCO et bordure dorée |
| Permissions | Filtrage à plat | Filtrage récursif et Paramètres pour super-administrateur |
| Route active | Égalité stricte | Sous-routes reconnues, licences distinctes |

Les composants de navigation sont repris directement de FEVOCO avec la marque FECOT. Les modules métier absents affichent explicitement « Module en préparation ». Aucun changement de données, de classeur ou de fichier d’environnement.

## Vérifications après modification

- Compilation de production réussie ; vérification TypeScript réussie.
- 70 tests existants et 2 tests supplémentaires de navigation et de permissions réussis.
- Navigateur local isolé : ordre des six groupes, 17 liens, sélection active, repli des groupes, réduction du menu, infobulles, stockage de la préférence, panneau mobile et fermeture avec Échap vérifiés.
- Parcours territoriaux liste, détail, modification, création des structures enfants et droits de consultation vérifiés avec écritures en mémoire uniquement.
- Comparaison visuelle à 1440 × 1000 avec les composants Sidebar et Header FEVOCO chargés en lecture seule. Les données territoriales et dépendances FECOT restent communes au banc de comparaison ; ce n’est pas une capture du serveur FEVOCO. Logo FECOT servi localement dans les captures finales.

Captures : [avant ordinateur](navigation-qa/01-fecot-avant-desktop.png), [avant mobile](navigation-qa/02-fecot-avant-mobile.png), [après ordinateur](navigation-qa/03-fecot-apres-desktop.png), [menu mobile](navigation-qa/04-fecot-apres-mobile.png), [composants FEVOCO de référence](navigation-qa/05-reference-fevoco-desktop.png).

Limites : les modules non territoriaux sont des pages d’attente explicites ; leurs interfaces métier ne sont pas implémentées par cette correction. Aucun test d’écriture sur Google Sheets ni nouveau déploiement.

## Continuité du menu pendant le chargement

Cause reproduite : chaque page remontait son propre DashboardLayout, initialisé sans droits. Les liens disparaissaient jusqu’à la réponse de `/api/auth/session`.

Correction : les pages de gestion partagent maintenant `app/(dashboard)/layout.tsx`. Ce layout fournit les droits résolus côté serveur au menu dès son premier rendu. Le menu reste monté pendant les transitions ; il ne lance plus de requête de session dans le navigateur. Les URL et les contrôles de permissions serveur restent identiques.

Régression : `node scripts/navigation-continuity-qa.mjs` échouait avant la correction avec « Navigation absente avant la réponse session ». Il vérifie maintenant la présence immédiate des liens avec une réponse retardée, la conservation du même élément de navigation et de l’état replié d’un groupe après changement du contenu.
