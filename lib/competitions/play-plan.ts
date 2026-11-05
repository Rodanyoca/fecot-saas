// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {civilDate,idField,isActive,normalize,rows,type Row} from "./model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {changed,checkGroup,checkUnitAssignment,fail,phaseAssignments,positiveInteger,requireActor,requireRef,requireRow,sportFormat,unique} from "./rules.ts"
import type {PlanContext} from "./planner.ts"
const dependency=(message:string):never=>fail(message,undefined,"DEPENDENCY",409)
const dateWithin=(date:string,competition:Row,field:string)=>{if(date<competition.date_debut||date>competition.date_fin)fail("La date doit appartenir à la période de compétition.",field)}
const decisionCode=(name:string)=>normalize(name).split(/[^A-Z]+/)[0]
const finalStatus=(name:string)=>["JOUE","OFFICIEL","VALIDE","VALIDE_FEDERATION","HOMOLOGUE","CORRIGE"].includes(normalize(name))
function reviseRankings(ctx:PlanContext,phaseId:string,groupId:string){
 const impacted=rows(ctx.source,"classement").filter(r=>r.id_phase_competition===phaseId&&(!r.id_groupe||r.id_groupe===groupId)&&r.rang)
 if(!impacted.length)return
 if(!ctx.reviewRankings)dependency("La correction exige la confirmation de mise en révision des classements de cette phase.")
 for(const row of impacted)ctx.write("classement",{...row,matchs_joues:"",victoires:"",defaites:"",points_pour:"",points_contre:"",difference_points:"",points_classement:"",rang:""},row.id_classement)
}
export function planPlay(ctx:PlanContext,root:Row,currentId?:string){
 const {entity,values:v,current,source,competition,id,write}=ctx
 switch(entity){
  case "affectation":{
   const phase=requireRow(source,"phase",v.id_phase_competition,"id_phase_competition"),unit=requireRow(source,"unite",v.id_unite_competition,"id_unite_competition")
   if(!isActive(phase)||!isActive(unit)||unit.id_epreuve_competition!==phase.id_epreuve_competition)fail("L’unité et la phase doivent être actives et relever de la même épreuve.")
   checkGroup(source,phase,v.id_groupe);const assignmentType=requireRef(source,"TYPES_AFFECTATIONS_PHASES",v.id_type_affectation_phase,"id_type_affectation_phase"),initial=["INITIAL","ENGAGEMENT","ENGAGEMENT_INITIAL","INSCRIPTION"].includes(normalize(assignmentType.nom_type_affectation_phase))
   if(initial&&v.id_phase_source||!initial&&!v.id_phase_source)fail("Une qualification doit préciser sa phase source ; une affectation initiale ne peut pas en déclarer.","id_phase_source")
   unique(source,entity,currentId,r=>r.id_phase_competition===v.id_phase_competition&&r.id_unite_competition===v.id_unite_competition&&isActive(r)&&v.statut==="ACTIF")
   if(v.id_phase_source){
    const previous=requireRow(source,"phase",v.id_phase_source,"id_phase_source")
    if(previous.id_epreuve_competition!==phase.id_epreuve_competition||Number(previous.numero_phase)>=Number(phase.numero_phase))fail("La phase source doit être antérieure et appartenir à la même épreuve.","id_phase_source")
    if(!phaseAssignments(source).some(a=>a.id_phase_competition===v.id_phase_source&&a.id_unite_competition===v.id_unite_competition&&isActive(a)))fail("L’unité ne participe pas à la phase source.","id_unite_competition")
   }else if(v.id_match_source)fail("Une phase source est obligatoire avec un combat source.","id_phase_source")
   if(v.id_match_source){
    const match=requireRow(source,"combat",v.id_match_source,"id_match_source"),result=rows(source,"resultat").find(r=>r.id_match===v.id_match_source)
    if(match.id_phase_competition!==v.id_phase_source||!result||result.id_unite_vainqueur!==v.id_unite_competition)fail("Le combat source doit avoir été gagné officiellement par cette unité dans la phase source.","id_match_source")
    const status=requireRef(source,"STATUTS_RESULTATS",result!.id_statut_resultat,"id_statut_resultat")
    if(!finalStatus(status.nom_statut_resultat))fail("Le résultat source n’est pas officiel.","id_match_source")
   }
   if(current&&(changed(current,v,["id_phase_competition","id_unite_competition","id_groupe"])||v.statut==="INACTIF"&&current.statut!=="INACTIF")){
    const used=rows(source,"combat").some(m=>m.id_phase_competition===current.id_phase_competition&&[m.id_unite_a,m.id_unite_b].includes(current.id_unite_competition)&&isActive(m))||rows(source,"prestation").some(p=>p.id_phase_competition===current.id_phase_competition&&p.id_unite_competition===current.id_unite_competition&&isActive(p))
    if(used)dependency("Cette affectation possède encore des combats ou prestations actifs.")
   }
   write(entity,root,currentId);break
  }
  case "combat":{
   const phase=requireRow(source,"phase",v.id_phase_competition,"id_phase_competition"),event=requireRow(source,"epreuve",phase.id_epreuve_competition)
   if(!sportFormat(source,competition,event).combats)fail("Le format de cette épreuve ne permet pas un combat kyorugi au meilleur de trois manches.","id_phase_competition","FORMAT",503)
   if(!isActive(phase)||!isActive(event))fail("Phase ou épreuve inactive.","id_phase_competition")
   checkGroup(source,phase,v.id_groupe)
   if(v.id_unite_a===v.id_unite_b)fail("Deux unités distinctes sont obligatoires.","id_unite_b")
   checkUnitAssignment(source,phase,v.id_groupe,v.id_unite_a);checkUnitAssignment(source,phase,v.id_groupe,v.id_unite_b);dateWithin(v.date_match,competition,"date_match")
   unique(source,entity,currentId,m=>m.id_phase_competition===v.id_phase_competition&&m.id_groupe===v.id_groupe&&civilDate(m.date_match)===v.date_match&&m.heure_match===v.heure_match&&[m.id_unite_a,m.id_unite_b].includes(v.id_unite_a)&&[m.id_unite_a,m.id_unite_b].includes(v.id_unite_b))
   const linked=rows(source,"resultat").filter(r=>r.id_match===id)
   if(linked.length&&changed(current,v,["id_phase_competition","id_groupe","id_unite_a","id_unite_b","date_match"]))dependency("Le résultat existant verrouille les participants, la phase et la date du combat.")
   if(linked.length&&v.statut_match==="ANNULE"&&linked.some(r=>normalize(requireRef(source,"STATUTS_RESULTATS",r.id_statut_resultat,"id_statut_resultat").nom_statut_resultat)!=="ANNULE"&&normalize(requireRef(source,"STATUTS_RESULTATS",r.id_statut_resultat,"id_statut_resultat").nom_statut_resultat)!=="ANNULEE"))dependency("Annulez d’abord le résultat du combat.")
   write(entity,root,currentId);break
  }
  case "resultat":{
   const match=requireRow(source,"combat",v.id_match,"id_match"),phase=requireRow(source,"phase",match.id_phase_competition),event=requireRow(source,"epreuve",phase.id_epreuve_competition)
   if(!sportFormat(source,competition,event).combats)fail("Un résultat de combat ne peut pas être utilisé comme résultat de poomsae.","id_match","FORMAT",503)
   if(!isActive(match))fail("Combat annulé ou inactif.","id_match")
   checkGroup(source,phase,match.id_groupe);checkUnitAssignment(source,phase,match.id_groupe,match.id_unite_a);checkUnitAssignment(source,phase,match.id_groupe,match.id_unite_b)
   const type=requireRef(source,"TYPES_RESULTATS",v.id_type_resultat,"id_type_resultat"),status=requireRef(source,"STATUTS_RESULTATS",v.id_statut_resultat,"id_statut_resultat"),cancelled=["ANNULE","ANNULEE"].includes(normalize(status.nom_statut_resultat))
   if(type.id_discipline&&type.id_discipline!==event.id_discipline)fail("Type de résultat incompatible avec la discipline.","id_type_resultat")
   let decision=""
   if(v.id_decision_resultat){const row=requireRef(source,"DECISIONS_RESULTATS",v.id_decision_resultat,"id_decision_resultat");decision=decisionCode(row.nom_decision_resultat);if(!["PTF","RSC","WDR","DSQ","DQB"].includes(decision))fail("Code de décision WT non configuré pour le meilleur de trois manches.","id_decision_resultat")}
   if(finalStatus(status.nom_statut_resultat)&&(!decision||!v.id_unite_vainqueur))fail("Un résultat officiel exige une décision WT et un vainqueur déclaré.","id_unite_vainqueur")
   if(v.id_unite_vainqueur&&![match.id_unite_a,match.id_unite_b].includes(v.id_unite_vainqueur))fail("Le vainqueur doit être une des deux unités du combat.","id_unite_vainqueur")
   for(const key of ["score_a","score_b"])if(v[key]&&!/^[012]$/.test(v[key]))fail("Nombre de manches gagnées attendu : entier entre 0 et 2.",key)
   if(v.score_a==="2"&&v.score_b==="2")fail("Un combat au meilleur de trois manches ne peut pas attribuer deux manches gagnées à chaque unité.","score_b")
   if(decision==="PTF"&&!cancelled){if(!v.score_a||!v.score_b||!([v.score_a,v.score_b].includes("2"))||v.score_a===v.score_b)fail("La décision PTF exige deux manches gagnées et zéro ou une manche perdue.","score_a");const winner=v.score_a==="2"?match.id_unite_a:match.id_unite_b;if(v.id_unite_vainqueur!==winner)fail("Le vainqueur déclaré contredit le nombre de manches gagnées.","id_unite_vainqueur")}
   if(cancelled&&(v.id_unite_vainqueur||v.score_a||v.score_b))fail("Un résultat annulé doit avoir ses manches et son vainqueur vides.")
   unique(source,entity,currentId,r=>r.id_match===v.id_match)
   if(changed(current,v,["score_a","score_b","id_unite_vainqueur","id_statut_resultat","id_decision_resultat"])){
    if((current!.id_unite_vainqueur!==v.id_unite_vainqueur||!finalStatus(status.nom_statut_resultat))&&phaseAssignments(source).some(a=>a.id_match_source===v.id_match&&isActive(a)))dependency("Désactivez et réexaminez les qualifications issues de ce combat avant de changer son vainqueur ou de retirer son résultat officiel.")
    reviseRankings(ctx,phase.id_phase_competition,match.id_groupe)
   }
   write(entity,root,currentId);break
  }
  case "prestation":{
   if(!source.tables.prestation||!source.tables.resultatPrestation)fail("Les feuilles de prestations attendent une évolution de schéma approuvée.",undefined,"SCHEMA_EVOLUTION",503)
   const phase=requireRow(source,"phase",v.id_phase_competition,"id_phase_competition"),event=requireRow(source,"epreuve",v.id_epreuve_competition,"id_epreuve_competition"),unit=requireRow(source,"unite",v.id_unite_competition,"id_unite_competition")
   if(!sportFormat(source,competition,event).prestations)fail("Format poomsae reconnu ou libre non configuré.","id_epreuve_competition","FORMAT",503)
   if(phase.id_epreuve_competition!==event.id_epreuve_competition||unit.id_epreuve_competition!==event.id_epreuve_competition||!isActive(phase)||!isActive(unit))fail("Phase et unité actives de la même épreuve requises.")
   const assignments=phaseAssignments(source).filter(a=>a.id_phase_competition===phase.id_phase_competition&&a.id_unite_competition===unit.id_unite_competition&&isActive(a))
   if(assignments.length!==1)fail("Une affectation unique à cette phase est requise.","id_unite_competition")
   checkGroup(source,phase,assignments[0].id_groupe)
   positiveInteger(v.ordre_passage,"ordre_passage");dateWithin(v.date_prestation,competition,"date_prestation")
   unique(source,entity,currentId,p=>p.id_phase_competition===v.id_phase_competition&&Number(p.ordre_passage)===Number(v.ordre_passage))
   if(rows(source,"resultatPrestation").some(r=>r.id_prestation===id)&&changed(current,v,["id_epreuve_competition","id_phase_competition","id_unite_competition","date_prestation"]))dependency("Le résultat de prestation verrouille ses relations sportives.")
   write(entity,root,currentId);break
  }
  case "resultatPrestation":{
   if(!source.tables.resultatPrestation)fail("La feuille des résultats de prestations n’est pas configurée.",undefined,"SCHEMA_EVOLUTION",503)
   const prestation=requireRow(source,"prestation",v.id_prestation,"id_prestation"),event=requireRow(source,"epreuve",prestation.id_epreuve_competition),status=requireRef(source,"STATUTS_RESULTATS",v.id_statut_resultat,"id_statut_resultat"),type=requireRef(source,"TYPES_RESULTATS",v.id_type_resultat,"id_type_resultat")
   if(!sportFormat(source,competition,event).prestations)fail("Cette prestation ne relève pas d’un format poomsae configuré.","id_prestation")
   if(!isActive(prestation))fail("Prestation inactive.","id_prestation")
   const phase=requireRow(source,"phase",prestation.id_phase_competition),assignments=phaseAssignments(source).filter(a=>a.id_phase_competition===phase.id_phase_competition&&a.id_unite_competition===prestation.id_unite_competition&&isActive(a));if(assignments.length!==1)fail("Affectation de prestation absente ou ambiguë.","id_prestation");checkUnitAssignment(source,phase,assignments[0].id_groupe,prestation.id_unite_competition)
   if(type.id_discipline&&type.id_discipline!==event.id_discipline)fail("Type de résultat d’une autre discipline.","id_type_resultat")
   if(v.id_decision_resultat)requireRef(source,"DECISIONS_RESULTATS",v.id_decision_resultat,"id_decision_resultat")
   if(!v.note_officielle&&!v.rang_officiel&&!v.id_decision_resultat)fail("Saisissez une note, un rang ou une décision officielle.")
   if(v.note_officielle&&(Number(v.note_officielle.replace(",","."))<0||Number(v.note_officielle.replace(",","."))>10))fail("La note officielle poomsae doit être comprise entre 0 et 10.","note_officielle")
   positiveInteger(v.rang_officiel,"rang_officiel",true)
   if(["ANNULE","ANNULEE"].includes(normalize(status.nom_statut_resultat))&&(v.note_officielle||v.rang_officiel))fail("Un résultat annulé ne doit conserver ni note ni rang.")
   unique(source,entity,currentId,r=>r.id_prestation===v.id_prestation)
   if(changed(current,v,["note_officielle","rang_officiel","id_statut_resultat","id_decision_resultat"])){
    if(phaseAssignments(source).some(a=>a.id_phase_source===prestation.id_phase_competition&&isActive(a)))dependency("Réexaminez les qualifications de cette phase avant de corriger la note ou le rang.")
    reviseRankings(ctx,prestation.id_phase_competition,assignments[0].id_groupe)
   }
   write(entity,root,currentId);break
  }
  case "classement":{
   const phase=requireRow(source,"phase",v.id_phase_competition,"id_phase_competition");checkGroup(source,phase,v.id_groupe);checkUnitAssignment(source,phase,v.id_groupe,v.id_unite_competition);positiveInteger(v.rang,"rang")
   unique(source,entity,currentId,r=>r.id_phase_competition===v.id_phase_competition&&r.id_groupe===v.id_groupe&&r.id_unite_competition===v.id_unite_competition)
   write(entity,root,currentId);break
  }
  case "distinction":{
   const event=requireRow(source,"epreuve",v.id_epreuve_competition,"id_epreuve_competition"),type=requireRef(source,"TYPES_DISTINCTIONS",v.id_type_distinction,"id_type_distinction"),target=normalize(type.cible_autorisee)
   if(Boolean(v.id_unite_competition)===Boolean(v.id_acteur))fail("Choisissez une seule cible : unité sportive ou acteur.")
   if(v.id_unite_competition){const unit=requireRow(source,"unite",v.id_unite_competition,"id_unite_competition");if(unit.id_epreuve_competition!==event.id_epreuve_competition)fail("Unité d’une autre épreuve.","id_unite_competition");if(!["UNITE","COLLECTIF","TOUS"].includes(target))fail("Ce type de distinction n’autorise pas une unité.","id_type_distinction");if(v.id_type_acteur)fail("Aucun type d’acteur n’est attendu pour une unité.","id_type_acteur")}
   else{const {kind}=requireActor(source,v.id_type_acteur,v.id_acteur),allowed=target==="TOUS"||target==="ACTEUR"||target==="ATHLETE"&&kind==="athletes"||target==="COACH"&&kind==="coachs";if(!allowed)fail("Type de distinction incompatible avec cet acteur.","id_type_distinction");if(!rows(source,"intervenant").some(p=>p.id_type_acteur===v.id_type_acteur&&p.id_acteur===v.id_acteur&&isActive(p))&&!rows(source,"unite").some(u=>kind==="athletes"&&u.id_athlete===v.id_acteur&&u.id_epreuve_competition===event.id_epreuve_competition&&isActive(u)))fail("L’acteur doit être engagé ou inscrit comme intervenant de cette compétition.","id_acteur")}
   if(v.id_phase_competition&&requireRow(source,"phase",v.id_phase_competition,"id_phase_competition").id_epreuve_competition!==event.id_epreuve_competition)fail("Phase d’une autre épreuve.","id_phase_competition")
   if(v.id_match){const match=requireRow(source,"combat",v.id_match,"id_match");if(!v.id_phase_competition||match.id_phase_competition!==v.id_phase_competition)fail("Le combat doit appartenir à la phase sélectionnée.","id_match")}
   unique(source,entity,currentId,r=>isActive(r)&&v.statut==="ACTIF"&&["id_epreuve_competition","id_type_distinction","id_unite_competition","id_acteur","id_type_acteur","id_phase_competition","id_match"].every(k=>r[k]===v[k]))
   write(entity,root,currentId);break
  }
  default:fail(`Commande ${entity} non prise en charge.`)
 }
}
