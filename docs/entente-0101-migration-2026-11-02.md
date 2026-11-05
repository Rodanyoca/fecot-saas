# Modification autorisée de l'entente existante

Le 2 novembre 2026, après la livraison du correctif local, l'utilisateur a explicitement demandé de modifier l'identifiant de l'entente existante. Cette instruction autorise cette écriture métier précise ; aucune publication applicative n'a été effectuée.

- Classeur vérifié : `01_FECOT_STRUCTURE_TERRITORIALE`, feuille `ENTENTES`, cellule `A2` (sheetId `90784613`).
- Ancienne valeur texte : `FECOT-ENT-0d09376b-2878-47c3-a9fe-c9ccdbf43518`.
- Nouvelle valeur texte : `0101` = ligue `01` + code local `01`.
- Relecture préalable des trois classeurs FECOT configurés : 26 ligues, une entente, zéro club ; aucune référence à l'ancienne clé dans les colonnes examinées. L'inventaire de consommateurs externes reste non confirmé.
- En-têtes et cellule relus avec les métadonnées natives avant écriture : clé littérale, sans formule ni validation restreignant ce remplacement ; aucune cible `0101` déjà occupée dans la colonne des IDs.
- Écriture Google Sheets unique `updateCells`, limitée à `ENTENTES!A2`, masque `userEnteredValue`, valeur explicite `stringValue: "0101"`. Aucune modification de style, de parent, de code local, de coordonnées ou de comptes.
- Confirmation native : `userEnteredValue`, `effectiveValue` et affichage valent tous le texte `0101`. Ligue, ville et code local inchangés.
- Relecture des références après modification à 13 h 13 Europe/Paris (12:13:01 UTC) : une seule entente `0101`, zéro club ; aucune collision ou référence orpheline dans l'inventaire examiné. Le plan ne propose plus de cellule à modifier.

Le rapport `identifiants-ententes-correspondance.json` décrit l'état préparatoire **avant** cette écriture ; le présent document enregistre son application ultérieure. Les sorties techniques locales de relecture restent dans `test-results/entente-ids-20261102/`. Aucun nom de personne, mot de passe ou secret n'est conservé dans cette preuve.

Actualiser complètement la page Ententes et utiliser la nouvelle clé dans les liens (`/ententes?id=0101`). Le cache territorial conserve sa durée de 30 secondes ; aucune purge globale, modification du serveur utilisateur ou affaiblissement des droits n'a été ajouté pour cette opération. En cas de vue ancienne, recharger après renouvellement du cache.

Retour arrière, uniquement sur nouvelle instruction : relire la clé, vérifier les nouvelles références créées depuis cette opération et restaurer de manière coordonnée l'ancien ID et ses références si nécessaire. Ne pas réécrire seulement cette cellule si des clubs/affiliations ont entre-temps été rattachés à `0101`.

Aucun commit, push ou déploiement. Aucun autre dépôt modifié.
