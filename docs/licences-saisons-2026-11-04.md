# Licences — référentiel Saison modifié, 4 novembre 2026

Cible vérifiée : `data/monosport/fecot-managment`. Travaux locaux et non suivis
conservés ; aucun changement d'un autre dépôt, commit, push ou déploiement.

## Référence observée et rapport d'écart

Lecture connecteur uniquement du [référentiel FECOT](https://docs.google.com/spreadsheets/d/1vRg2U_SnY0uNbhZRFlM9-dAQWsqBTU7v2R_qSyeyeV0/edit),
métadonnées puis SAISON!A1:J70, STATUTS_SAISON!A1:J35 et
STATUT_LICENCE!A1:J35. SAISON (sheetId 1800020028) conserve les colonnes
id_saison, nom_saison, observation, date_debut, date_fin, id_statut_saison.
52 saisons annuelles 1982–2032 observées dans la plage bornée A1:J70,
placées dans un ordre non chronologique :
2021–2032, puis 1982–2020. SAI006 / 2026 est ACTIVE, SAI007 / 2027 et les
suivantes PLANIFIEE, les années antérieures CLOTUREE. Aucun renommage ou
effacement de licence réalisé. Le registre des licences nominatives n'a pas
été lu pour cet audit.

STATUTS_SAISON (sheetId 1800020000) : id_statut_saison, nom_statut,
description, statut ; cinq libellés CLOTUREE, ACTIVE, PLANIFIEE, SUSPENDUE,
ANNULEE, activés par le champ statut=ACTIF. STATUT_LICENCE est aussi renseigné.
Les deux autres listes de configuration, types/cycles, ne sont pas réauditées
dans ce lot ; leurs anciennes limites ne sont pas réputées levées.

| Écart confirmé | Conséquence | Correction |
| --- | --- | --- |
| Le service ignorait STATUTS_SAISON et la FK id_statut_saison | Création et renouvellement possibles sur saison clôturée/suspendue | Lecture groupée, résolution par ID et libellé, contrôle frais serveur |
| Liste proposée dans l'ordre physique, choix selon préfixe d'année puis première ligne | Année mal choisie si libellé différent, série historique ou plusieurs saisons actives | Tri par date décroissante, unique saison ACTIVE par défaut ; sinon toutes les saisons sans choix arbitraire |
| Compteurs et badges des athlètes utilisaient le statut enregistré seul | Ancienne licence ACTIVE comptée active après clôture de saison | Statut effectif commun aux compteurs, filtres, listes et historiques |
| Compteur « Expirées / clôturées » comptait toutes les non actives | Licences planifiées présentées comme expirées | Libellé « Non actives » |
| Référence saison absente sans alerte dédiée | Perte de sens de la période historique | ID historique conservé, SAISON INVALIDE et anomalie ; aucune réparation inventée |

Les trois premières régressions sont reproduites avant correction par les
tests : statut VALIDE au lieu de CLOTUREE ; POST accepté sur statut inconnu ;
absence de defaultSeasonId.

## Règles retenues et fichiers

- `lib/licences/service.ts` : id_statut_saison requis ; STATUTS_SAISON ajouté
  au même batchGet des références, schéma vérifié. Toujours cinq appels métier
  à froid sur la page athlètes, zéro additionnel à chaud, hors droits frais.
  Toutes les mutations utilisent déjà load(..., true), donc un changement du
  référentiel après ouverture du formulaire est revalidé avant écriture.
- `lib/licences/model.ts` : résolution des statuts sans codes STS codés en dur,
  dates civiles cohérentes et IDs uniques. Création individuelle et renouvellement
  collectif réservés aux saisons ACTIVE/PLANIFIEE dont le statut est activé.
  Les autres saisons restent consultables. Une modification administrative d'une
  licence existante ne change pas sa saison et ne réouvre pas la saison.
  Une référence inconnue/inactive interdit une nouvelle création ; un doublon
  de source est déjà rejeté par le parseur avec 503. Pas de repli permissif.
- Statut effectif : une licence enregistrée suspendue/clôturée/annulée garde
  cette priorité. Pour une licence enregistrée ACTIVE, une saison clôturée,
  suspendue ou annulée impose cet état ; une référence/dates invalides donne
  SAISON_INVALIDE ; sinon les dates déterminent VALIDE/A_VENIR/EXPIREE.
  Une saison planifiée ne produit pas de licence VALIDE. Les statuts stockés
  ne sont jamais réécrits automatiquement.
- `components/licences/licences-client.tsx` : choix par défaut transmis par le
  serveur, tri des saisons, statut effectif dans badges/filtres/KPI/synthèses,
  compteur Non actives. Les états enregistrés restent accessibles dans l'éditeur.
- `components/licences/licence-editor.tsx` : création limitée aux saisons
  autorisées, consultation/édition conserve les saisons historiques et leur ID,
  état et période affichés ; options déjà chargées, aucune requête à l'ouverture.
- `components/licences/licence-history.tsx` : même statut effectif dans les fiches.
- `tests/licences-fixture.ts`, `tests/licences.test.ts`, `scripts/licences-qa.mjs` :
  sources synthétiques actualisées, régressions serveur et navigateur.

Les identifiants SAI… restent des chaînes. Les affiliations, numéros, versions,
droits AUT-SPT et confirmations d'écriture conservent leur fonctionnement.
L'entourage reste périodique et indépendant de SAISON ; aucune dépendance
nouvelle à cette feuille pour ces licences. Aucun changement des quotas Google.

## Limites et vérification après livraison

Les références en cache peuvent rester visibles jusqu'à 300 secondes ; le bouton
Actualiser les licences force la relecture. Les mutations n'utilisent pas ce
cache. Un ancien onglet de développement peut nécessiter Ctrl+Maj+R, comme le
précédent défaut d'affichage des fiches ; cela n'efface aucune donnée.

Modifier les dates/statuts d'une saison affecte immédiatement l'interprétation
de toutes ses licences après relecture. Renommer son ID, à la différence du nom,
casserait les relations existantes : aucune migration automatique et aucun
renommage autorisé par ce lot. Une donnée orpheline reste visible.

Les pages d'historique restent dépendantes d'une source disponible : une panne
Google renvoie une erreur, jamais un historique vide inventé ni des droits périmés.
La préinscription sur saison PLANIFIEE est autorisée ; aucune nouvelle règle de
date d'ouverture administrative ou durée fixe n'est inventée.

Recette locale/ultérieure : Actualiser → saison 2026 par défaut → consulter une
ancienne saison → vérifier Non actives et badges → ouvrir création (anciennes
années absentes) → sélectionner saison planifiée → contrôler dates et affiliation.
Tester les mutations uniquement dans un classeur de test distinct autorisé.
Aucune écriture métier de test effectuée sur Google dans ce lot.

Retour arrière : retirer seulement la résolution et les contrôles des saisons
de ce lot ainsi que leur affichage, en conservant le module Licences, les droits,
les confirmations, les affiliations et les corrections de fiches. Pas de donnée
à annuler ni d'identifiant à renuméroter.

## Validation

`npm.cmd test` final : **146 tests réussis**, dont 21 spécifiques Licences et
cinq nouveaux scénarios Saison. Cas couverts : statut fermé/inconnu/inactif,
doublons, dates incohérentes, création planifiée, renouvellement refusé,
modification administrative historique, choix de saison indépendant de l'ordre,
source indisponible, revalidation après cache chaud et suppression de référence.
Preuve : `test-results/licences-saison/tests.log`.

La première recette navigateur a réussi huit scénarios sur données synthétiques
aux largeurs 1440 et 390 ; la vérification visuelle a ensuite déclenché la
correction du libellé du cinquième compteur et des séparateurs du bandeau Saison.
Le dernier `npm.cmd run lint` (alias de `tsc --noEmit`, aucun ESLint distinct)
est réussi après les ajustements finaux. `git diff --check` est réussi, avec
l'avertissement préexistant de conversion LF/CRLF du README. Une recette
navigateur finale a été interrompue uniquement pour libérer la mémoire pendant
TypeScript ; elle est relancée seule après la fin de celui-ci. Son résultat
est consigné ci-après à la fin. Aucun échec d'assertion n'est masqué par cet arrêt.

Build Next normal tenté dans la copie isolée existante, sans `.env` de production,
sans ignorer les contrôles et sans toucher à `.next/dev` du serveur utilisateur.
Compilation réussie en 6,4 minutes ; arrêt ciblé pendant TypeScript après environ
699 secondes sous forte pression mémoire (environ 650 Mo libres observés).
Cette première tentative **n'est pas validée**. Les derniers ajustements de libellé, séparateurs,
alerte orpheline et fallback d'option historique sont postérieurs à cette copie.
Preuves : `test-results/licences-saison/build.{json,log}` (code d'arrêt
4294967295). Seuls le build isolé et ses enfants vérifiés ont été arrêtés ;
le serveur de développement utilisateur est resté actif. Aucun autre build
n'est lancé sous la même pression mémoire.

Les tests Google sont simulés à la frontière transport ; les lectures réelles
se limitent aux références citées plus haut. Aucun test d'écriture Google,
benchmark de charge ou gain CPU Vercel n'est revendiqué. L'avertissement Node
MODULE_TYPELESS_PACKAGE_JSON est préexistant ; l'avertissement de lockfile du
build vient de sa copie isolée. Aucune option permissive ajoutée.

Recette navigateur finale terminée : **8 scénarios réussis**, aucun problème
JavaScript, sur ordinateur 1440 px et mobile 390 px. Vérifications : parcours
athlète et entourage, création/édition/consultation, renouvellement collectif,
suspension/réactivation, droits READ, panne source, références vides, saisons
clôturées consultables/exclues de création et saison planifiée avec dates.
Les ouvertures et filtres n'ajoutent pas de requête ; les captures sont
synthétiques. Preuves : `test-results/licences/browser.json`,
`test-results/licences/{athletes,entourage,season-closed}-{1440,390}.png`.

Après libération de la mémoire par la fin de tous les autres contrôles, une
dernière tentative de build normal est lancée seule dans la même copie isolée,
cette fois synchronisée avec les sources finales. Son journal distinct
`test-results/licences-saison/final/build.{json,log}` préserve la première
tentative interrompue.

Verdict final : **build normal réussi, code 0**, 179 fichiers applicatifs
inchangés dans la copie de validation, sans identifiants de production ni
option permissive. Durée écoulée totale 2 577 035 ms (environ 42 min 57 s) :
compilation annoncée en 3,9 minutes, TypeScript en 38,4 minutes, puis 32 pages
générées et optimisation terminée. Cette lenteur locale importante est
conservée comme résultat défavorable ; aucune baisse de CPU ni amélioration
Vercel n'en est déduite. Les tests, TypeScript/lint, huit scénarios navigateur
et ce build portent sur le code final ; seule la documentation est complétée
après leur exécution. Le serveur utilisateur n'a pas été redémarré.
