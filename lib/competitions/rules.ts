// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {ActorError,actorConfig,actorKinds,type ActorKind} from "../actors/model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {fields,administrativeStatuses,competitionStatuses,participationStatuses,matchStatuses} from "./fields.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {byId,civilDate,idField,inputDate,isActive,normalize,refSchema,rows,schema,type Entity,type Reference,type Row,type Source} from "./model.ts"
export const fail=(message:string,field?:string,code="VALIDATION",status=422):never=>{throw new ActorError(code,message,status,field?{[field]:message}:{})}
export function requireRow(source:Source,entity:Entity,id:string,field:string=idField(entity)):Row{const row=byId(source,entity,id);if(!row)fail("Référence inconnue ou étrangère à cette compétition.",field);return row!}
export function requireRef(source:Source,name:Reference,id:string,field:string):Row{const spec=refSchema[name],found=(source.refs[name]||[]).filter(r=>r[spec[0]]===id);if(!id||found.length!==1)fail(`Référence ${name} absente, inconnue ou ambiguë.`,field);return found[0]}
export const refLabel=(source:Source,name:Reference,id:string)=>{const spec=refSchema[name];return source.refs[name]?.find(r=>r[spec[0]]===id)?.[spec[1]]||""}
export function sportFormat(source:Source,competition:Row,event?:Row){
 const discipline=normalize(refLabel(source,"DISCIPLINES",event?.id_discipline||competition.id_discipline)),type=source.refs.TYPES_COMPETITIONS?.find(r=>r.id_type_competition===competition.id_type_competition),format=normalize(event?.format_resultat||type?.format||"")
 const combats=discipline==="KYORUGI"&&format==="WT_KYORUGI_BEST_OF_THREE",prestations=discipline.startsWith("POOMSAE")&&["WT_POOMSAE_RECONNU","WT_POOMSAE_LIBRE"].includes(format)
 return {combats,prestations,message:combats?"Résultat officiel au meilleur de trois manches ; aucun calcul d’arbitrage automatique.":prestations?"Note et rang officiels de prestation ; aucun recalcul des notes des juges.":"Le format sportif de ce type de compétition n’est pas configuré. Les scores ne seront pas déduits du nom de l’épreuve."}
}
export function phaseMode(source:Source,phase:Row){const mode=normalize(refLabel(source,"MODES_PHASES",phase.id_mode_phase));if(!["GROUPES","ELIMINATION_DIRECTE","AUTRE"].includes(mode))fail("Mode de phase absent ou non pris en charge.","id_mode_phase");return mode}
export function phaseAssignments(source:Source):Row[]{
 const canonical=rows(source,"affectation"),keys=new Set(canonical.map(r=>`${r.id_phase_competition}:${r.id_unite_competition}`)),groups=new Map(rows(source,"groupe").map(r=>[r.id_groupe,r]))
 const historical:Row[]=rows(source,"groupeUnite").flatMap(r=>{const group=groups.get(r.id_groupe);return group&&!keys.has(`${group.id_phase_competition}:${r.id_unite_competition}`)?[{...r,id_phase_unite:r.id_affectation_groupe,id_phase_competition:group.id_phase_competition}]:[]})
 return [...canonical,...historical]
}
export function checkGroup(source:Source,phase:Row,groupId:string){
 const mode=phaseMode(source,phase)
 if(mode==="GROUPES"&&!groupId)fail("Cette phase exige un groupe.","id_groupe")
 if(mode!=="GROUPES"&&groupId)fail("Ce mode de phase n’utilise pas de groupe.","id_groupe")
 if(groupId){const group=requireRow(source,"groupe",groupId,"id_groupe");if(group.id_phase_competition!==phase.id_phase_competition||!isActive(group))fail("Groupe étranger à la phase ou inactif.","id_groupe")}
}
export function checkUnitAssignment(source:Source,phase:Row,groupId:string,unitId:string){
 const unit=requireRow(source,"unite",unitId,"id_unite_competition")
 const engagement=requireRow(source,"engagement",unit.id_participation,"id_participation")
 if(!isActive(engagement)||engagement.id_competition!==unit.id_competition||engagement.id_epreuve_competition!==unit.id_epreuve_competition||engagement.id_athlete!==unit.id_athlete||engagement.id_club!==unit.id_club)fail("L’unité ne correspond pas à un engagement actif cohérent.","id_unite_competition")
 if(!isActive(unit)||unit.id_epreuve_competition!==phase.id_epreuve_competition)fail("Unité inactive ou relevant d’une autre épreuve.","id_unite_competition")
 const assigned=phaseAssignments(source).filter(r=>r.id_phase_competition===phase.id_phase_competition&&r.id_unite_competition===unitId&&isActive(r))
 if(assigned.length!==1||assigned[0].id_groupe!==groupId)fail("L’unité doit avoir une affectation active unique dans cette phase et ce groupe.","id_unite_competition")
 return unit
}
export function actorKind(source:Source,typeId:string):ActorKind{
 const ref=requireRef(source,"TYPES_ACTEURS",typeId,"id_type_acteur"),kind=actorKinds.find(k=>actorConfig[k].sheet===ref.source_donnees?.trim().toUpperCase())
 if(!kind)fail("Le type d’acteur ne pointe pas vers une feuille FECOT reconnue.","id_type_acteur")
 return kind!
}
export function requireActor(source:Source,typeId:string,id:string){const kind=actorKind(source,typeId),actor=source.actors[actorConfig[kind].sheet]?.find(r=>r[actorConfig[kind].id]===id);if(!actor)fail("Acteur inconnu pour ce type.","id_acteur");return {actor:actor!,kind}}
function sexCode(source:Source,value:string){const label=normalize(refLabel(source,"SEXES",value)||value);return ["M","MASCULIN","HOMME"].includes(label)?"M":["F","FEMININ","FEMME"].includes(label)?"F":label==="MIXTE"?"X":""}
export function athleteCompatibility(source:Source,competition:Row,event:Row,athlete:Row){
 const wanted=sexCode(source,event.id_sexe),actual=sexCode(source,athlete.id_sexe)
 if(!wanted||!["M","F"].includes(actual)||wanted!=="X"&&wanted!==actual)fail("Sexe de l’athlète incompatible avec l’épreuve.","id_athlete")
 const ageCategory=requireRef(source,"CATEGORIES_AGE",event.id_categorie_age,"id_categorie_age"),sportCategory=event.id_categorie_competition?requireRef(source,"CATEGORIES_COMPETITION",event.id_categorie_competition,"id_categorie_competition"):null
 const birth=civilDate(athlete.date_naissance||athlete.date_de_naissance||""),year=Number(competition.date_debut.slice(0,4)),age=birth?year-Number(birth.slice(0,4)):null
 for(const category of [ageCategory,sportCategory])if(category){
  if(category.age_min||category.age_max){if(age==null||age<0)fail("Date de naissance requise pour contrôler l’âge WT par année de compétition.","id_athlete");for(const key of ["age_min","age_max"])if(category[key]&&!/^\d+$/.test(category[key]))fail("Limites d’âge du référentiel invalides.","id_categorie_age","REFERENCE",503);if(category.age_min&&category.age_max&&Number(category.age_min)>Number(category.age_max))fail("Limites d’âge inversées dans le référentiel.","id_categorie_age","REFERENCE",503);if(category.age_min&&age!<Number(category.age_min)||category.age_max&&age!>Number(category.age_max))fail("Âge WT incompatible avec la catégorie de l’épreuve.","id_athlete")}
  if(category.sexe){const sex=sexCode(source,category.sexe);if(!sex||sex!=="X"&&sex!==actual)fail("Sexe incompatible avec la catégorie sportive.","id_categorie_competition")}
  if(category.poids_min||category.poids_max)fail("Cette catégorie exige une pesée officielle qui n’est pas représentée dans le schéma FECOT actuel.","id_categorie_competition","SCHEMA_EVOLUTION",503)
 }
}
export function parseValues(entity:Entity,input:unknown,current?:Row){
 if(!input||typeof input!=="object"||Array.isArray(input))fail("Valeurs de formulaire invalides.")
 const body=input as Record<string,unknown>,allowed=fields[entity],keys=new Set(allowed.map(f=>f.key)),values:Row={}
 if(Object.keys(body).some(k=>!keys.has(k)))fail("Identifiant, parent ou champ non modifiable.",undefined,"IMMUTABLE")
 for(const field of allowed){const value=body[field.key];if(value!==undefined&&typeof value!=="string")fail("Valeur texte attendue.",field.key);const v=typeof value==="string"?value.trim():current?.[field.key]||"";if(v.length>(field.key==="observations"?5000:300))fail("Valeur trop longue.",field.key);if(field.required&&!v)fail("Champ obligatoire.",field.key);values[field.key]=field.type==="date"?inputDate(v,field.key,!field.required):v;if(field.type==="time"&&v&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))fail("Heure invalide (HH:MM).",field.key);if(field.type==="number"&&v&&!/^-?\d+(?:[.,]\d+)?$/.test(v))fail("Nombre invalide.",field.key);if(field.locked&&current&&values[field.key]!==current[field.key])fail("Cette relation est immuable.",field.key,"IMMUTABLE")}
 if("statut"in values&&!administrativeStatuses.includes(values.statut)&&entity!=="competition")fail("Statut administratif invalide.","statut")
 if(entity==="competition"&&!competitionStatuses.includes(values.statut))fail("Statut de compétition invalide.","statut")
 if(entity==="engagement"&&!participationStatuses.includes(values.statut_participation))fail("Statut d’engagement invalide.","statut_participation")
 if(entity==="combat"&&!matchStatuses.includes(values.statut_match))fail("Statut de combat invalide.","statut_match")
 return values
}
export function changed(current:Row|undefined,values:Row,keys:string[]){return !!current&&keys.some(k=>k.startsWith("date_")?civilDate(values[k]||"")!==civilDate(current[k]||""):(values[k]||"")!==(current[k]||""))}
export function positiveInteger(value:string,field:string,optional=false){if(!value&&optional)return;if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<1)fail("Entier strictement positif attendu.",field)}
export function unique(source:Source,entity:Entity,currentId:string|undefined,predicate:(row:Row)=>boolean){if(rows(source,entity).some(r=>r[idField(entity)]!==currentId&&predicate(r)))fail("Un enregistrement équivalent existe déjà.",undefined,"DUPLICATE",409)}
export function writableRecord(entity:Entity,id:string,values:Row){return Object.fromEntries(schema[entity].map(key=>[key,key===idField(entity)?id:values[key]||""]))}
