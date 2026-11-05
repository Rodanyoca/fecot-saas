// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {resultFormats} from "./fields.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {byId,civilDate,idField,isActive,nextId,normalize,rows,scopeRows,type Entity,type Row,type Source} from "./model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {athleteCompatibility,changed,checkGroup,fail,parseValues,phaseAssignments,phaseMode,positiveInteger,refLabel,requireActor,requireRef,requireRow,unique,writableRecord} from "./rules.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {planPlay} from "./play-plan.ts"
export type MutationWrite={entity:Entity;record:Row;editing?:string}
export type PlanContext={entity:Entity;id:string;values:Row;current?:Row;source:Source;raw:Source;competition:Row;reviewRankings:boolean;writes:MutationWrite[];allocate:(entity:Entity)=>string;write:(entity:Entity,record:Row,editing?:string)=>void}
const dependency=(message="Cette modification invaliderait des éléments dépendants."):never=>fail(message,undefined,"DEPENDENCY",409)
const hasUnit=(match:Row,id:string)=>match.id_unite_a===id||match.id_unite_b===id
export function planMutation(raw:Source,entity:Entity,competitionId:string|undefined,input:unknown,currentId?:string,reviewRankings=false){
 if(entity==="unite"||entity==="groupeUnite")fail("Les unités sont créées par un engagement ; l’historique des groupes est en lecture seule.",undefined,"READ_ONLY",405)
 const source=competitionId?scopeRows(raw,competitionId):raw,current=currentId?byId(source,entity,currentId):undefined
 if(currentId&&!current)fail("Enregistrement introuvable dans cette compétition.",undefined,"NOT_FOUND",404)
 const values=parseValues(entity,input,current),parent=entity==="competition"?{...current,...values}:requireRow(source,"competition",competitionId||"","id_competition")
 const competition:Row={...parent,date_debut:civilDate(parent.date_debut),date_fin:civilDate(parent.date_fin)}
 if(!competition.date_debut||!competition.date_fin||competition.date_fin<competition.date_debut)fail("Période de compétition absente ou incohérente.","date_fin")
 const year=competition.date_debut.slice(0,4),allocated:Partial<Record<Entity,Row[]>>={}
 const allocate=(kind:Entity)=>{const records=allocated[kind]||[...rows(raw,kind)],id=nextId(kind,year,records);records.push({[idField(kind)]:id});allocated[kind]=records;return id}
 const id=currentId||allocate(entity),writes:MutationWrite[]=[]
 const write=(kind:Entity,record:Row,editing?:string)=>{if(!record[idField(kind)])fail("Identifiant de destination absent.");const output=writableRecord(kind,record[idField(kind)],record);if(kind==="epreuve"&&raw.tables.epreuve?.headers.includes("format_resultat"))output.format_resultat=record.format_resultat||"";writes.push({entity:kind,record:output,...(editing?{editing}:{})})}
 const ctx:PlanContext={entity,id,values,current,source,raw,competition,reviewRankings,writes,allocate,write}
 const root={...current,...values,[idField(entity)]:id,id_competition:entity==="competition"?id:competitionId||""}
 switch(entity){
  case "competition":{
   requireRef(source,"TYPES_COMPETITIONS",values.id_type_competition,"id_type_competition");requireRef(source,"DISCIPLINES",values.id_discipline,"id_discipline");requireRef(source,"SAISON",values.id_saison,"id_saison")
   unique(raw,entity,currentId,r=>normalize(r.nom_competition)===normalize(values.nom_competition)&&r.id_saison===values.id_saison&&r.numero_edition===values.numero_edition&&civilDate(r.date_debut)===values.date_debut)
   if(changed(current,values,["id_discipline","id_type_competition","id_saison"])&&rows(source,"epreuve").length)dependency("Des épreuves existent : les références structurantes de la compétition sont verrouillées.")
   if(rows(source,"combat").some(m=>civilDate(m.date_match)<values.date_debut||civilDate(m.date_match)>values.date_fin))dependency("La nouvelle période exclut un combat programmé.")
   if(rows(source,"prestation").some(p=>civilDate(p.date_prestation)<values.date_debut||civilDate(p.date_prestation)>values.date_fin))dependency("La nouvelle période exclut une prestation programmée.")
   write(entity,root,currentId);break
  }
  case "epreuve":{
   requireRef(source,"DISCIPLINES",values.id_discipline,"id_discipline");requireRef(source,"CATEGORIES_AGE",values.id_categorie_age,"id_categorie_age");requireRef(source,"SEXES",values.id_sexe,"id_sexe")
   if(values.id_discipline!==competition.id_discipline)fail("La discipline de l’épreuve doit être celle de la compétition.","id_discipline")
   if(values.id_categorie_competition)requireRef(source,"CATEGORIES_COMPETITION",values.id_categorie_competition,"id_categorie_competition")
   if(values.format_resultat&&!raw.tables.epreuve?.headers.includes("format_resultat"))fail("Le format par épreuve attend l’ajout approuvé de la colonne format_resultat.","format_resultat","SCHEMA_EVOLUTION",503)
   if(values.format_resultat&&!resultFormats.some(f=>f.id===values.format_resultat))fail("Format de résultat non pris en charge.","format_resultat")
   unique(source,entity,currentId,r=>normalize(r.nom_epreuve)===normalize(values.nom_epreuve))
   const linked=rows(source,"unite").some(u=>u.id_epreuve_competition===id)||rows(source,"phase").some(p=>p.id_epreuve_competition===id)
   if(linked&&changed(current,values,["id_discipline","id_categorie_age","id_sexe","id_categorie_competition","format_resultat"]))dependency("Les catégories et le format sont verrouillés tant que des phases ou unités y sont liées.")
   if(linked&&values.statut==="INACTIF"&&current?.statut!=="INACTIF")dependency("Désactivez d’abord les éléments dépendants de cette épreuve.")
   write(entity,root,currentId);break
  }
  case "phase":{
   const event=requireRow(source,"epreuve",values.id_epreuve_competition,"id_epreuve_competition");if(!isActive(event))fail("Épreuve inactive.","id_epreuve_competition")
   requireRef(source,"TYPES_PHASES",values.id_type_phase,"id_type_phase");requireRef(source,"MODES_PHASES",values.id_mode_phase,"id_mode_phase");phaseMode(source,values);positiveInteger(values.numero_phase,"numero_phase")
   unique(source,entity,currentId,r=>r.id_epreuve_competition===values.id_epreuve_competition&&Number(r.numero_phase)===Number(values.numero_phase))
   const linked=rows(source,"groupe").some(g=>g.id_phase_competition===id)||phaseAssignments(source).some(a=>a.id_phase_competition===id)||rows(source,"combat").some(m=>m.id_phase_competition===id)
   if(linked&&changed(current,values,["id_epreuve_competition","id_mode_phase","numero_phase"]))dependency("Le mode, l’épreuve et l’ordre de cette phase sont déjà utilisés.")
   if(linked&&values.statut==="INACTIF"&&current?.statut!=="INACTIF")dependency("Désactivez d’abord les groupes, affectations et combats liés.")
   write(entity,root,currentId);break
  }
  case "groupe":{
   const phase=requireRow(source,"phase",values.id_phase_competition,"id_phase_competition");if(!isActive(phase)||phaseMode(source,phase)!=="GROUPES")fail("Un groupe exige une phase active en mode GROUPES.","id_phase_competition")
   unique(source,entity,currentId,r=>r.id_phase_competition===values.id_phase_competition&&normalize(r.nom_groupe)===normalize(values.nom_groupe))
   const linked=phaseAssignments(source).some(a=>a.id_groupe===id)||rows(source,"combat").some(m=>m.id_groupe===id)
   if(linked&&(changed(current,values,["id_phase_competition"])||values.statut==="INACTIF"&&current?.statut!=="INACTIF"))dependency("Ce groupe possède des affectations ou combats.")
   write(entity,root,currentId);break
  }
  case "engagement":{
   const event=requireRow(source,"epreuve",values.id_epreuve_competition,"id_epreuve_competition"),phase=requireRow(source,"phase",values.id_phase_competition,"id_phase_competition")
   if(!isActive(event)||!isActive(phase)||phase.id_epreuve_competition!==event.id_epreuve_competition)fail("La phase initiale doit être active et appartenir à l’épreuve.","id_phase_competition")
   checkGroup(source,phase,values.id_groupe)
   const type=requireRef(source,"TYPES_UNITES_COMPETITION",values.id_type_unite_competition,"id_type_unite_competition")
   if(!["ATHLETE","INDIVIDUEL","INDIVIDUELLE"].includes(normalize(type.nom_type_unite_competition)))fail("La composition collective n’est pas représentée dans le schéma FECOT actuel. Une unité de club ne remplace pas les membres d’une équipe.","id_type_unite_competition","SCHEMA_EVOLUTION",503)
   const athlete=source.actors.ATHLETES?.find(a=>a.id_athlete===values.id_athlete),club=source.clubs.find(c=>c.id_club===values.id_club)
   if(!athlete||athlete.statut!=="ACTIF")fail("Athlète FECOT actif introuvable.","id_athlete");if(!club||!isActive(club))fail("Club actif introuvable.","id_club")
   athleteCompatibility(source,competition,event,athlete!)
   if(competition.date_debut.slice(0,4)!==competition.date_fin.slice(0,4))fail("L’année sportive WT doit être précisée pour une compétition couvrant deux années.","id_athlete","CONFIG",503)
   const affiliation=source.affiliations.some(a=>{const start=civilDate(a.date_debut),end=civilDate(a.date_fin||""),status=normalize(refLabel(source,"STATUTS_AFFILIATION",a.id_statut_affiliation)||a.statut_affiliation||"");return a.id_athlete===values.id_athlete&&a.id_club===values.id_club&&["ACTIF","ACTIVE"].includes(status)&&!!start&&start<=competition.date_debut&&(!a.date_fin||!!end&&end>=competition.date_debut)})
   if(!affiliation)fail("Une affiliation réelle de cet athlète à ce club doit couvrir le début de la compétition.","id_athlete")
   const assignmentType=requireRef(source,"TYPES_AFFECTATIONS_PHASES",values.id_type_affectation_phase,"id_type_affectation_phase")
   if(!["INITIAL","ENGAGEMENT","ENGAGEMENT_INITIAL","INSCRIPTION"].includes(normalize(assignmentType.nom_type_affectation_phase)))fail("Choisissez un type d’affectation initiale.","id_type_affectation_phase")
   unique(source,entity,currentId,r=>r.id_epreuve_competition===values.id_epreuve_competition&&r.id_athlete===values.id_athlete)
   const units=rows(source,"unite").filter(u=>u.id_participation===currentId),unit=current?units[0]:undefined
   if(current&&units.length!==1)fail("L’engagement ne possède pas une unité canonique unique.",undefined,"SCHEMA",503)
   const assignments=unit?rows(source,"affectation").filter(a=>a.id_unite_competition===unit.id_unite_competition):[],initial=assignments.find(a=>!a.id_phase_source)
   const withdrawing=["RETIRE","ANNULE"].includes(values.statut_participation),structural=changed(current,values,["id_epreuve_competition","id_club","id_athlete","id_type_unite_competition"]),moving=!!initial&&(initial.id_phase_competition!==values.id_phase_competition||initial.id_groupe!==values.id_groupe)
   if(unit&&(withdrawing||structural||moving)&&(rows(source,"combat").some(m=>hasUnit(m,unit.id_unite_competition))||rows(source,"prestation").some(p=>p.id_unite_competition===unit.id_unite_competition)||rows(source,"intervenant").some(p=>p.id_unite_competition===unit.id_unite_competition)||rows(source,"distinction").some(d=>d.id_unite_competition===unit.id_unite_competition)||rows(source,"classement").some(c=>c.id_unite_competition===unit.id_unite_competition&&c.rang)||assignments.some(a=>a.id_phase_source)))dependency("Cet engagement est déjà utilisé par des combats, prestations, classements, intervenants, distinctions ou qualifications.")
   const unitId=unit?.id_unite_competition||allocate("unite"),assignmentId=initial?.id_phase_unite||allocate("affectation")
   write(entity,root,currentId)
   write("unite",{...unit,id_unite_competition:unitId,id_competition:competitionId!,id_epreuve_competition:values.id_epreuve_competition,id_type_unite_competition:values.id_type_unite_competition,id_club:values.id_club,id_athlete:values.id_athlete,id_participation:id,statut:withdrawing?"INACTIF":"ACTIF",observations:values.observations},unit?.id_unite_competition)
   write("affectation",{...initial,id_phase_unite:assignmentId,id_phase_competition:values.id_phase_competition,id_groupe:values.id_groupe,id_unite_competition:unitId,id_type_affectation_phase:values.id_type_affectation_phase,id_phase_source:"",id_match_source:"",date_affectation:values.date_inscription,statut:withdrawing?"INACTIF":"ACTIF",observations:values.observations},initial?.id_phase_unite)
   if(withdrawing)for(const assignment of assignments.filter(a=>a!==initial))write("affectation",{...assignment,statut:"INACTIF"},assignment.id_phase_unite)
   break
  }
  case "intervenant":{
   const {actor,kind}=requireActor(source,values.id_type_acteur,values.id_acteur)
   if(changed(current,values,["id_acteur","id_type_acteur"])&&rows(source,"distinction").some(d=>d.id_acteur===current!.id_acteur&&d.id_type_acteur===current!.id_type_acteur))dependency("Une distinction liée à cet acteur empêche de remplacer son identité dans cette inscription.")
   if(actor.statut!=="ACTIF")fail("Acteur inactif.","id_acteur")
   if(values.id_unite_competition)requireRow(source,"unite",values.id_unite_competition,"id_unite_competition")
   if(values.id_fonction)requireRef(source,"FONCTIONS",values.id_fonction,"id_fonction")
   unique(source,entity,currentId,r=>r.id_type_acteur===values.id_type_acteur&&r.id_acteur===values.id_acteur&&isActive(r)&&values.statut==="ACTIF")
   const typeLabels:Record<string,string>={athletes:"ATHLETE",coachs:"COACH",arbitres:"ARBITRE",officiels:"OFFICIEL",medecins:"MEDECIN","autres-acteurs":"AUTRE"}
   const unit=values.id_unite_competition?requireRow(source,"unite",values.id_unite_competition):null
    write(entity,{...root,type_participant:typeLabels[kind],id_club:unit?.id_club||""},currentId);break
  }
  default:planPlay(ctx,root,currentId)
 }
 return {id,entity,writes}
}
