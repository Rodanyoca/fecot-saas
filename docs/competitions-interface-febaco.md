# Compétitions FECOT — harmonisation visuelle FEBACO

Intervention du 4 novembre 2026, uniquement dans
`C:/Projets/SNDS-RDC/data/monosport/fecot-managment`. FEBACO est lu sous
`data/monosport/febaco-managment`, sans modification. Branche/main et HEAD
`1517431ca3cb786caaa914129bebf779ba6578c7` conservés ; travaux locaux et fichiers
non suivis préservés, aucun commit/push/déploiement. Les couleurs FECOT établies
(actions bleues, marque or) restent conservées : pas de changement global du thème.

## Références et écarts confirmés dans le code

| Vue | FEBACO faisant référence | Écart FECOT constaté | Correction locale |
| --- | --- | --- | --- |
| Liste | `app/dashboard/competitions/page.tsx` : tableau directement dans main, Créer à droite | Carte supplémentaire, titre et barre d'actualisation intermédiaire | Carte retirée, mêmes espacements `space-y-4 p-4 sm:p-6`, bouton Créer à droite |
| Recherche/filtres | Recherche, Saison, Pays, Statut visibles ; libellés Toutes les saisons/Tous les pays/Tous les statuts | Filtres différents et Tous sans libellé visible | Reprise des trois filtres et labels, recherche locale ; aucune requête en saisissant |
| Actions liste | Consultation avec l'œil, modification dans la fiche | Modification supplémentaire dans la liste | Consultation seule dans la liste ; modification conservée dans Général |
| Fiche | `app/dashboard/competitions/[id]/page.tsx` : Édition + saison, retour outline, bandeau d'onglets | Boutons flottants, sous-titre institutionnel et barre de date | Bandeau regroupé responsive, titre/saison et retour conformes ; actualisation manuelle compacte conservée |
| Général | Deux DetailCard Informations générales/Trophy et Organisation/MapPin | Une seule grande carte à champs en grille | Réutilisation du DetailCard FECOT, mêmes classes et disposition en deux colonnes/empilement mobile |
| Création | `competition-create-modal.tsx` : Dialog centré, max-height 90vh, largeur 2xl, grille deux colonnes | Sheet étroit à droite et formulaire sur une colonne | Dialog identique à la primitive FEBACO, champs ordonnés Type/Discipline, Saison/Statut, dates ; noms et pied Créer harmonisés |
| Modification | `competition-edit-sheet.tsx` : Sheet largeur 2xl, champs groupés | Sheet xl à champs empilés | Même largeur et grille ; identifiant/version et confirmations FECOT conservés |
| Épreuves | `competition-events-panel.tsx` : cartes md:2/xl:3, action Créer à droite, édition par icône | Tableau générique | Cartes et Dialog de saisie ; champs âge/sexe/catégorie taekwondo conservés |
| Phases | `competition-structure-panel.tsx` : création phase/groupe puis cartes groupées par épreuve | Trois tableaux génériques empilés | Formulaires réutilisés dans deux cartes, phases par épreuve, groupes en pastilles ; affectations/qualifications restent accessibles |
| Engagements | `competition-participants-panel.tsx` : section principale sans carte supplémentaire | Tableaux d'engagements et unités de même importance | Athlètes engagés en section principale, unités associées dans un volet repliable ; aucune confusion avec les équipes basket |

## Adaptations conservées et limites de fidélité

Le bandeau compte dix onglets, car Prestations poomsae reste distinct de Combats.
Il utilise les classes FEBACO et des boutons natifs accessibles (tablist, tabpanel,
aria-selected, flèches/Home/End), sans ajouter une dépendance Radix Tabs absente de
FECOT. Le Dialog est repris de FEBACO ; Radix Dialog est déjà installé dans FECOT.
Le composant commun DataTable reçoit seulement deux options facultatives reprises
de FEBACO (`showFilterLabels`, `Filter.allLabel`), désactivées par défaut. Les
autres pages FECOT ne changent pas leurs filtres ni leurs libellés.

Les permissions AUT-SPT, routes, mappings, règles, payloads et invalidations ne
sont pas modifiés. Aucun rôle federal copié de FEBACO, aucune équipe basket créée.
Les dates compactes FECOT et les catégories taekwondo restent conservées.
Les compteurs de phase utilisent les affectations et combats déjà chargés. Les
cartes d'épreuve ne déclenchent aucune nouvelle lecture pour inventer des compteurs
absents du jeu de données de cet onglet. Les formulaires s'ouvrent immédiatement,
et les sections/options restent chargées à leur consultation.

## Validation

Comparaison statique des fichiers FEBACO ci-dessus ; aucune session authentifiée
FEBACO n'est revendiquée comme testée ni comparaison pixel à pixel annoncée.
Recette Chromium FECOT avec composants et handlers réels, Google/auth simulés :
1440×1000 et 390×1000, zéro erreur JavaScript. Captures liste, général, création,
modification, épreuves et phases examinées. Contrôles du centrage du Dialog,
labels des filtres, bandeau/activation clavier, absence de débordement, lecture
paresseuse et réponse tardive, création et modification confirmées, droits refusés.
Le nombre de requêtes reste une par section consultée ; aucun appel par frappe,
ni pour l'ouverture du formulaire de création. Aucune donnée métier de production
n'est écrite pendant ces recettes.

Artefacts : `test-results/competitions/{results.json,*-liste.png,*-general.png,
*-creation.png,*-modification.png,*-epreuves.png,*-phases.png}` et journaux de
validation/build. Derniers contrôles : 171 tests réussis (46,7 s), TypeScript
réussi (67,9 s), lint/typecheck réussi (169,8 s, alias sans ESLint indépendant).
La recette Compétitions finale compte deux scénarios, zéro erreur JavaScript ;
la régression Acteurs `--athletes-only` compte deux scénarios ordinateur/mobile
réussis avec les options par défaut du DataTable. Build Next normal réussi,
sortie 0, 253 fichiers sources/configurations/tests identiques et inchangés dans
la copie isolée, sans environnement privé ni désactivation TypeScript. La durée
écoulée enregistrée par le runner est 8 241 946 ms (137 min 22 s) ; ce compteur
est une durée murale et ne mesure pas le CPU actif. Journaux conservés dans
`test-results/competitions/build.log` et `build.json`. La sortie .next utilisée
par la session locale est préservée. Les avertissements Node de type de package
et Next de package-lock parent restent visibles, sans configuration modifiée
pour les masquer. Aucun gain CPU Vercel n'est déduit de ce contrôle.
Le refus Google réel 403 documenté dans `competitions-fecot.md`
est indépendant de cette harmonisation et n'est pas masqué.

## Fichiers concernés et retour arrière

`components/competitions/competitions-client.tsx`, `competition-editor.tsx`,
nouveaux `competition-tabs.tsx` et `competition-panels.tsx` ;
`components/ui/dialog.tsx` repris de la référence ; options facultatives dans
`components/dashboard/data-table.tsx` ; recette `scripts/competitions-qa.mjs`.

Retour arrière ciblé : rétablir les versions précédentes de ces seuls composants,
du script et des options DataTable, sans toucher aux services/API, configurations,
documents privés ou tableaux Google. Aucun changement de schéma ni donnée à annuler.
