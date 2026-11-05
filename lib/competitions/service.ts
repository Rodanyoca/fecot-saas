import "server-only"
import {actorConfig,actorKinds,ActorError,type ActorKind,type ActorTable} from "../actors/model"
import {readActorSheets} from "../actors/service"
import {entityTables,referenceTables,competitionSheetNames,recordVersion} from "./store"
import {byId,civilDate,normalize,idField,refSchema,rows,schema,sections,scopeRows,type Dataset,type Entity,type Option,type Reference,type Row,type Section,type Source,type View} from "./model"
import {phaseAssignments,refLabel,sportFormat} from "./rules"
import {administrativeStatuses,competitionStatuses,participationStatuses,matchStatuses,resultFormats} from "./fields"
const graph:Record<Section,Entity[]>={
 general:["competition"],epreuves:["competition","epreuve"],engagements:["competition","epreuve","engagement","unite","phase","groupe","groupeUnite","affectation"],
 structure:["competition","epreuve","engagement","unite","phase","groupe","groupeUnite","affectation","combat","resultat"],
 intervenants:["competition","epreuve","engagement","unite","intervenant"],
 combats:["competition","epreuve","engagement","unite","phase","groupe","groupeUnite","affectation","combat","resultat"],
 prestations:["competition","epreuve","engagement","unite","phase","groupe","groupeUnite","affectation"],
 resultats:["competition","epreuve","engagement","unite","phase","groupe","groupeUnite","affectation","combat","resultat","classement"],
 classements:["competition","epreuve","engagement","unite","phase","groupe","groupeUnite","affectation","combat","resultat","classement"],
 distinctions:["competition","epreuve","engagement","unite","phase","groupe","groupeUnite","affectation","combat","intervenant","distinction"],
}
const extraRefs:Record<Section,Reference[]>={general:[],epreuves:["SEXES","CATEGORIES_AGE","CATEGORIES_COMPETITION"],engagements:["SEXES","CATEGORIES_AGE","CATEGORIES_COMPETITION","TYPES_UNITES_COMPETITION","TYPES_AFFECTATIONS_PHASES","MODES_PHASES","STATUTS_AFFILIATION"],structure:["TYPES_PHASES","MODES_PHASES","TYPES_AFFECTATIONS_PHASES","STATUTS_RESULTATS"],intervenants:["TYPES_ACTEURS","FONCTIONS"],combats:["MODES_PHASES","STATUTS_RESULTATS"],prestations:["MODES_PHASES"],resultats:["MODES_PHASES","TYPES_RESULTATS","STATUTS_RESULTATS","DECISIONS_RESULTATS"],classements:["MODES_PHASES","STATUTS_RESULTATS"],distinctions:["TYPES_DISTINCTIONS","TYPES_ACTEURS"]}
const common:Reference[]=["TYPES_COMPETITIONS","DISCIPLINES","SAISON","STATUTS_SAISON"]
export type LoadOptions={fresh?:boolean;write?:Entity;options?:boolean;typeId?:string}
export async function competitionSource(section:Section,competitionId?:string,options:LoadOptions={}):Promise<Source>{
 const entities=graph[section].filter(entity=>!(!options.write&&!options.options&&["structure","combats"].includes(section)&&entity==="resultat")),refs=[...new Set([...common,...extraRefs[section]])]
 // Mutations load the dependencies they protect; consultation never preloads all sections.
 if(options.write==="competition"&&competitionId)entities.push("epreuve","combat")
 if(options.write==="epreuve")entities.push("engagement","unite","phase")
 if(options.write==="engagement")entities.push("combat","intervenant","distinction","classement")
 if(options.write==="intervenant"){refs.push("TYPES_ACTEURS");entities.push("distinction")}
 const [tables,reference]=await Promise.all([entityTables([...new Set(entities)],options.fresh),referenceTables([...new Set(refs)],options.fresh)])
 let source:Source={tables,refs:reference.refs,actors:{},clubs:[],affiliations:[],issues:reference.issues}
 if(competitionId&&!byId(source,"competition",competitionId))throw new ActorError("NOT_FOUND","Compétition introuvable.",404)
 const scoped=competitionId?scopeRows(source,competitionId):source,competition=competitionId?byId(scoped,"competition",competitionId):undefined
 const poomsae=competition&&(sportFormat(scoped,competition).prestations||rows(scoped,"epreuve").some(event=>sportFormat(scoped,competition,event).prestations))
 if(competitionId&&(["prestations","resultats","classements"].includes(section)||options.write==="affectation"||options.write==="engagement"||options.write==="competition")&&poomsae){
  const available=await competitionSheetNames(options.fresh),optional:Entity[]=["prestation","resultatPrestation"],missing=optional.filter(entity=>!available.includes(entity==="prestation"?"COMPETITIONS_PRESTATIONS":"COMPETITIONS_RESULTATS_PRESTATIONS"))
  if(missing.length)source.issues.push({source:"PRESTATIONS",message:"Les feuilles de prestations ne sont pas configurées. L’évolution du classeur doit être approuvée et appliquée séparément.",blocking:true})
  else source.tables={...source.tables,...await entityTables(optional,options.fresh)}
 }
 const used=competitionId?scopeRows(source,competitionId):source,kinds=new Set<ActorKind>()
 if(rows(used,"unite").some(r=>r.id_athlete)||rows(used,"engagement").some(r=>r.id_athlete)||options.write==="engagement"||section==="engagements"&&options.options)kinds.add("athletes")
 const people=[...rows(used,"intervenant"),...rows(used,"distinction")],typeRows=source.refs.TYPES_ACTEURS||[]
 if(!options.write)for(const person of people){const type=typeRows.find(t=>t.id_type_acteur===person.id_type_acteur),kind=actorKinds.find(k=>actorConfig[k].sheet===type?.source_donnees?.trim().toUpperCase());if(kind&&person.id_acteur)kinds.add(kind)}
 if(options.typeId){const type=typeRows.find(t=>t.id_type_acteur===options.typeId),kind=actorKinds.find(k=>actorConfig[k].sheet===type?.source_donnees?.trim().toUpperCase());if(kind)kinds.add(kind)}
 const needClubs=options.write?options.write==="engagement":rows(used,"unite").some(r=>r.id_club)||rows(used,"engagement").some(r=>r.id_club)||people.some(r=>r.id_club)||section==="engagements"&&options.options
 const needAffiliations=options.write==="engagement"||section==="engagements"&&options.options
 const empty:Record<string,ActorTable>={}
 const [profiles,territory,affiliations]=await Promise.all([
  kinds.size?readActorSheets("FECOT_ACTEURS_SPREADSHEET_ID",[...kinds].map(k=>actorConfig[k].sheet),options.fresh):Promise.resolve(empty),
  needClubs?readActorSheets("FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID",["CLUBS"],options.fresh):Promise.resolve(empty),
  needAffiliations?readActorSheets("FECOT_AFFILIATIONS_SPREADSHEET_ID",["ATHLETE_AFFILIATIONS"],options.fresh):Promise.resolve(empty),
 ])
 source={...source,actors:Object.fromEntries(Object.entries(profiles).map(([key,table])=>[key,table.rows])),clubs:"CLUBS"in territory?territory.CLUBS.rows:[],affiliations:"ATHLETE_AFFILIATIONS"in affiliations?affiliations.ATHLETE_AFFILIATIONS.rows:[]}
 return source
}
export function competitionDataset(raw:Source,section:Section,competitionId?:string,options:LoadOptions={}):Dataset{
 const source=competitionId?scopeRows(raw,competitionId):raw,competition=competitionId?byId(source,"competition",competitionId):undefined
 const references:Record<string,Option[]>={}
 for(const [name,spec]of Object.entries(refSchema)as [Reference,readonly string[]][]){references[name]=(source.refs[name]||[]).map(r=>({id:r[spec[0]],label:r[spec[1]],...(name==="TYPES_ACTEURS"?{sheet:r.source_donnees||""}:{})}))}
 const clubs=new Map(source.clubs.map(c=>[c.id_club,c.nom_club||c.id_club])),athletes=new Map((source.actors.ATHLETES||[]).map(a=>[a.id_athlete,a.nom_complet||a.id_athlete]))
 const unitNames=new Map(rows(source,"unite").map(u=>[u.id_unite_competition,u.id_athlete?athletes.get(u.id_athlete)||u.id_athlete:clubs.get(u.id_club)||u.id_club||u.id_unite_competition]))
 const names:Record<string,Map<string,string>>={id_club:clubs,id_athlete:athletes,id_unite_competition:unitNames,id_unite_a:unitNames,id_unite_b:unitNames,id_unite_vainqueur:unitNames}
 const index=(entity:Entity,field:string,label:(r:Row)=>string)=>{names[field]=new Map(rows(source,entity).map(r=>[r[idField(entity)],label(r)]))}
 index("epreuve","id_epreuve_competition",r=>r.nom_epreuve);index("phase","id_phase_competition",r=>r.nom_phase);index("groupe","id_groupe",r=>r.nom_groupe);index("combat","id_match",r=>`${unitNames.get(r.id_unite_a)||r.id_unite_a} — ${unitNames.get(r.id_unite_b)||r.id_unite_b}`);index("prestation","id_prestation",r=>`${unitNames.get(r.id_unite_competition)||r.id_unite_competition} · ${r.ordre_passage}`)
 names.id_phase_source=names.id_phase_competition;names.id_match_source=names.id_match
 for(const [name,spec]of Object.entries(refSchema)as [Reference,readonly string[]][]){const map=new Map((source.refs[name]||[]).map(r=>[r[spec[0]],r[spec[1]]]));if(name!=="STATUTS_SAISON")names[spec[0]]=map}
 const profileNames=new Map<string,string>(),usedActors=new Set([...rows(source,"intervenant"),...rows(source,"distinction")].map(r=>`${r.id_type_acteur}:${r.id_acteur}`))
 for(const type of source.refs.TYPES_ACTEURS||[]){const kind=actorKinds.find(k=>actorConfig[k].sheet===type.source_donnees?.trim().toUpperCase());if(kind)for(const actor of source.actors[actorConfig[kind].sheet]||[]){const key=`${type.id_type_acteur}:${actor[actorConfig[kind].id]}`;if(usedActors.has(key))profileNames.set(key,actor.nom_complet)}}
 const profileName=(r:Row)=>profileNames.get(`${r.id_type_acteur}:${r.id_acteur}`)||""
 const view=(entity:Entity,r:Row):View=>{
  const values=Object.fromEntries(schema[entity].map(key=>[key,key.startsWith("date_")?civilDate(r[key]||"")||r[key]||"":r[key]||""])),labels:Row={},missing:string[]=[]
  if(entity==="epreuve"&&source.tables.epreuve?.headers.includes("format_resultat"))values.format_resultat=r.format_resultat||""
  for(const [key,value]of Object.entries(values))if(value&&names[key]){labels[key]=names[key].get(value)||value;if(!names[key].has(value))missing.push(key)}
  if(r.id_acteur){labels.id_acteur=profileName(r)||r.id_acteur;if(!profileName(r))missing.push("id_acteur")}
  const label=r.nom_competition||r.nom_epreuve||r.nom_phase||r.nom_groupe||labels.id_athlete||labels.id_acteur||labels.id_unite_competition||labels.id_match||labels.id_prestation||r[idField(entity)]
  return {id:r[idField(entity)],rowKey:`${entity}:${r[idField(entity)]}`,entity,version:recordVersion(r),values,label,status:entity==="classement"&&!r.rang?"A_REVISER":r.statut||r.statut_participation||r.statut_match||refLabel(source,"STATUTS_RESULTATS",r.id_statut_resultat||""),labels,anomaly:missing.length?`Références historiques introuvables : ${missing.join(", ")}. Identifiants conservés.`:""}
 }
 const entities:Dataset["entities"]={},visible=new Set<Entity>(sections[section])
 // Related tables provide labels/options, not full versioned DTOs for unopened sections.
 for(const entity of Object.keys(source.tables)as Entity[])if(visible.has(entity))entities[entity]=rows(source,entity).map(r=>view(entity,r))
 if(visible.has("affectation")&&(source.tables.affectation||source.tables.groupeUnite)){const canonical=new Set(rows(source,"affectation").map(a=>a.id_phase_unite));entities.affectation=phaseAssignments(source).map(a=>{const result=view("affectation",a);return canonical.has(a.id_phase_unite)?result:{...result,readOnly:true,rowKey:`legacy:${a.id_phase_unite}`}})}
 for(const [key,entity]of Object.entries({epreuves:"epreuve",phases:"phase",groupes:"groupe",unites:"unite",combats:"combat",prestations:"prestation"})as [string,Entity][]){references[key]=rows(source,entity).map(r=>({id:r[idField(entity)],label:names[idField(entity)]?.get(r[idField(entity)])||r[idField(entity)],phaseId:r.id_phase_competition||"",eventId:r.id_epreuve_competition||"",status:r.statut||r.statut_participation||r.statut_match||""}))}
 references.clubs=options.options&&section==="engagements"?source.clubs.map(c=>({id:c.id_club,label:c.nom_club||c.id_club})):[]
 const clubsByAthlete=new Map<string,Set<string>>(),affStatuses=new Map((source.refs.STATUTS_AFFILIATION||[]).map(r=>[r.id_statut_affiliation,r.nom_statut_affiliation]))
 if(options.options&&section==="engagements")for(const aff of source.affiliations){const start=civilDate(aff.date_debut),end=civilDate(aff.date_fin||""),on=civilDate(competition?.date_debut||""),status=normalize(affStatuses.get(aff.id_statut_affiliation)||aff.statut_affiliation||"");if(["ACTIF","ACTIVE"].includes(status)&&!!start&&start<=on&&(!aff.date_fin||!!end&&end>=on)){const clubs=clubsByAthlete.get(aff.id_athlete)||new Set<string>();clubs.add(aff.id_club);clubsByAthlete.set(aff.id_athlete,clubs)}}
 references.athletes=options.options&&section==="engagements"?(source.actors.ATHLETES||[]).filter(a=>a.statut==="ACTIF").map(a=>({id:a.id_athlete,label:a.nom_complet||a.id_athlete,clubs:JSON.stringify([...(clubsByAthlete.get(a.id_athlete)||[])])})):[]
 references.actors=[]
 if(options.options&&options.typeId){const type=source.refs.TYPES_ACTEURS?.find(t=>t.id_type_acteur===options.typeId),kind=actorKinds.find(k=>actorConfig[k].sheet===type?.source_donnees?.trim().toUpperCase());if(kind)references.actors=(source.actors[actorConfig[kind].sheet]||[]).filter(a=>a.statut==="ACTIF").map(a=>({id:a[actorConfig[kind].id],label:a.nom_complet||a[actorConfig[kind].id]}))}
 for(const [key,states]of Object.entries({administrative:administrativeStatuses,competitionStatuses,participationStatuses,matchStatuses}))references[key]=states.map(id=>({id,label:id.replaceAll("_"," ")}))
 const seasonStarts=new Map((source.refs.SAISON||[]).map(s=>[s.id_saison,s.date_debut]));references.SAISON.sort((a,b)=>(seasonStarts.get(b.id)||"").localeCompare(seasonStarts.get(a.id)||""))
 const activeSeasons=(source.refs.SAISON||[]).filter(s=>source.refs.STATUTS_SAISON?.some(t=>t.id_statut_saison===s.id_statut_saison&&t.nom_statut==="ACTIVE"&&t.statut==="ACTIF"))
 const base=competition?sportFormat(source,competition):{combats:false,prestations:false,message:"Choisissez une compétition."}
 const eventFormats=competition?rows(source,"epreuve").map(event=>sportFormat(source,competition,event)):[]
 const capabilities={...base,combats:base.combats||eventFormats.some(f=>f.combats),prestations:(base.prestations||eventFormats.some(f=>f.prestations))&&!!source.tables.prestation&&!!source.tables.resultatPrestation,eventFormatColumn:!!source.tables.epreuve?.headers.includes("format_resultat")}
 references.resultFormats=resultFormats
 if(competitionId&&entities.engagement){const units=rows(source,"unite");for(const participation of entities.engagement){const unit=units.find(u=>u.id_participation===participation.id),assignment=unit?phaseAssignments(source).find(a=>a.id_unite_competition===unit.id_unite_competition&&!a.id_phase_source):undefined;if(assignment){for(const key of ["id_phase_competition","id_groupe","id_type_affectation_phase"])participation.values[key]=assignment[key]||""}}}
 return {competition:competition?entities.competition?.find(c=>c.id===competitionId)||view("competition",competition):null,entities,references,issues:source.issues,capabilities,defaultSeasonId:activeSeasons.length===1?activeSeasons[0].id_saison:""}
}
