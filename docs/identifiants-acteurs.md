# Identifiants simples des acteurs FECOT

Sur demande utilisateur, les six catégories utilisent désormais une série serveur lisible. Les exemples COA-0001 et OFF0001 sont conservés exactement ; les autres séries suivent le même principe. Aucun autre dépôt modifié.

| Catégorie | Premier ID | Suivant | Chiffres |
| --- | --- | --- | --- |
| Athlètes | ATH00001 | ATH00002 | 5 |
| Entraîneurs | COA-0001 | COA-0002 | 4 |
| Arbitres | ARB0001 | ARB0002 | 4 |
| Officiels | OFF0001 | OFF0002 | 4 |
| Médecins | MED0001 | MED0002 | 4 |
| Autres acteurs | AUT0001 | AUT0002 | 4 |

`nextActorId` dans `lib/actors/model.ts` calcule le maximum numérique de la catégorie et ajoute un, sans combler les trous. Une variante historique avec/sans tiret du même préfixe réserve également son numéro, pour ne pas réutiliser un suffixe déjà attribué. Les anciennes clés UUID restent lisibles et sont conservées lors d'une modification ordinaire. La série ne déborde pas : après 9999 (99999 pour ATH), la création est refusée explicitement.

`saveActor` relit la catégorie et ses référentiels, valide les champs puis calcule la clé seulement à la création. Écriture RAW et confirmation par relecture restent inchangées. Le formulaire ne peut pas choisir la clé. La file de mutations existante sérialise les créations d'une même catégorie dans une instance. Aucun nouveau cache ni verrou Google n'est ajouté. Limite inchangée : Sheets et ce verrou mémoire ne garantissent pas une allocation atomique entre plusieurs instances Node ; une allocation centralisée est nécessaire avant de revendiquer cette garantie. Ne pas supprimer manuellement des clés encore référencées ni réutiliser la dernière clé après suppression.

## Données existantes

Lecture des colonnes d'identifiants FECOT jusqu'aux limites physiques relevées : un entraîneur possède encore une ancienne clé, aucune ligne dans ARBITRES/OFFICIELS/MEDECINS/AUTRES. Aucun faux acteur n'est créé pour remplir ces catégories. L'athlète ATH00001 renommé précédemment reste inchangé.

Après vérification de ses dépendances, l'entraîneur existant a été renommé :

| Ancien ID | Nouvel ID | Cible |
| --- | --- | --- |
| FECOT-COA-825b27c4-4172-49b5-bd2c-e8e2f213f6dd | COA-0001 | 02_FECOT_ACTEURS / COACHS!A2 |

Métadonnées et en-têtes des classeurs Affiliations, Licences, Compétitions, Équipe nationale, Activités, Documents, Structure territoriale et Users relus via le connecteur Google. Les 22 colonnes pertinentes id_athlete/id_coach/id_arbitre/id_officiel/id_medecin/id_autre_acteur/id_acteur/id_entite/id_objet ont été examinées sur les lignes physiques existantes : aucune occurrence de l'ancien ou du nouvel ID, aucune formule ; aucun média lié en R2:U2 de COACHS. Le schéma territorial et USERS n'ont pas de référence d'acteur ; seul id_objet du journal était candidat. Aucun nom, contact ou passeport consigné ici.

Préflight immédiat : un seul entraîneur, ancienne clé attendue, nouvelle clé libre, cellule littérale sans validation bloquante. Écriture native findReplace limitée à COACHS!A2, égalité stricte de cellule entière, sensible à la casse : une occurrence et une cellule modifiées. Relecture CellData : valeur saisie, effective et affichée COA-0001, formats et en-tête conservés. Aucun autre classeur ni média modifié. Le prochain entraîneur sera COA-0002 ; les catégories vides commenceront à 0001.

Retour arrière uniquement sur instruction : relire les références actuelles et restaurer la correspondance avec ses dépendances si elles ont été créées depuis. Ne pas restaurer seulement A2 quand d'autres lignes référencent désormais COA-0001.

## Validation

`npm.cmd test` : 108 tests réussis. Tests dédiés `tests/actor-ids.test.ts` : formats et zéros, premier/suivant, variantes de séparateur, coexistence UUID, maximum et épuisement, créations simultanées dans une même instance, mises à jour conservant l'ancienne clé et refus d'un ID envoyé par le formulaire. Les tests ATH existants restent valides. `npm.cmd run typecheck` : réussi. Les créations de test sont uniquement en mémoire, aucune écriture métier de test Google.

Fichiers applicatifs : `lib/actors/model.ts` et `lib/actors/service.ts`. Tests : `tests/actor-ids.test.ts` et adaptation de `tests/actors-api.test.ts`. Logs ignorés : `test-results/actor-ids-all-{tests,typescript}.log`. Aucun push ni déploiement.
