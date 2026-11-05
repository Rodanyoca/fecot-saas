// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {ActorError,type ActorRow,type ActorTable} from "../actors/model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {formatDateForSheet,formatDateFromSheet} from "../compact-date.ts"
export type Row=ActorRow
export type Table=ActorTable
export const schema={
 competition:["id_competition","numero_edition","nom_competition","id_type_competition","id_discipline","id_saison","date_debut","date_fin","pays","lieu","statut","observations"],
 epreuve:["id_epreuve_competition","id_competition","nom_epreuve","id_discipline","id_categorie_age","id_sexe","id_categorie_competition","statut","observations"],
 engagement:["id_participation","id_competition","id_epreuve_competition","id_type_unite_competition","id_club","id_athlete","date_inscription","statut_participation","observations"],
 unite:["id_unite_competition","id_competition","id_epreuve_competition","id_type_unite_competition","id_club","id_athlete","id_equipe_nationale_saison","id_participation","statut","observations"],
 phase:["id_phase_competition","id_competition","id_epreuve_competition","id_type_phase","id_mode_phase","numero_phase","nom_phase","statut","observations"],
 groupe:["id_groupe","id_phase_competition","nom_groupe","statut","observations"],
 groupeUnite:["id_affectation_groupe","id_groupe","id_unite_competition","statut","observations"],
 affectation:["id_phase_unite","id_phase_competition","id_groupe","id_unite_competition","id_type_affectation_phase","id_phase_source","id_match_source","date_affectation","statut","observations"],
 combat:["id_match","id_competition","id_phase_competition","id_groupe","id_unite_a","id_unite_b","date_match","heure_match","statut_match","observations"],
 resultat:["id_resultat","id_match","score_a","score_b","id_unite_vainqueur","id_statut_resultat","id_type_resultat","id_decision_resultat","observations"],
 classement:["id_classement","id_competition","id_phase_competition","id_groupe","id_unite_competition","matchs_joues","victoires","defaites","points_pour","points_contre","difference_points","points_classement","rang","observations"],
 intervenant:["id_intervenant_competition","id_competition","type_participant","id_acteur","id_type_acteur","id_unite_competition","id_fonction","id_club","role_participant","statut","observations"],
 distinction:["id_distinction_competition","id_competition","id_epreuve_competition","id_type_distinction","id_unite_competition","id_acteur","id_type_acteur","id_phase_competition","id_match","date_attribution","statut","observations"],
 // Proposed extensions only: no automatic creation or migration in Google.
 prestation:["id_prestation","id_competition","id_epreuve_competition","id_phase_competition","id_unite_competition","ordre_passage","date_prestation","heure_prestation","statut","observations"],
 resultatPrestation:["id_resultat_prestation","id_prestation","id_type_resultat","id_statut_resultat","id_decision_resultat","note_officielle","rang_officiel","observations"],
} as const
export type Entity=keyof typeof schema
export const sheets:Record<Entity,string>={competition:"COMPETITIONS",epreuve:"COMPETITIONS_EPREUVES",engagement:"COMPETITIONS_PARTICIPANTS",unite:"COMPETITIONS_UNITES",phase:"COMPETITIONS_PHASES",groupe:"COMPETITIONS_GROUPES",groupeUnite:"COMPETITIONS_GROUPES_UNITES",affectation:"COMPETITIONS_PHASES_UNITES",combat:"COMPETITIONS_MATCHS",resultat:"COMPETITIONS_RESULTATS",classement:"COMPETITIONS_CLASSEMENT",intervenant:"COMPETITIONS_INTERVENANTS",distinction:"COMPETITIONS_DISTINCTIONS",prestation:"COMPETITIONS_PRESTATIONS",resultatPrestation:"COMPETITIONS_RESULTATS_PRESTATIONS"}
export const sections={general:["competition"],epreuves:["epreuve"],engagements:["engagement","unite"],structure:["phase","groupe","affectation"],intervenants:["intervenant"],combats:["combat"],prestations:["prestation"],resultats:["resultat","resultatPrestation"],classements:["classement"],distinctions:["distinction"]} as const satisfies Record<string,readonly Entity[]>
export type Section=keyof typeof sections
export const titles:Record<Entity,string>={competition:"Compétition",epreuve:"Épreuve",engagement:"Engagement",unite:"Unité sportive",phase:"Phase",groupe:"Groupe",groupeUnite:"Affectation historique de groupe",affectation:"Affectation / qualification",combat:"Combat",resultat:"Résultat de combat",classement:"Classement officiel",intervenant:"Intervenant",distinction:"Distinction",prestation:"Prestation",resultatPrestation:"Résultat de prestation"}
export const refSchema={DISCIPLINES:["id_discipline","nom_discipline"],TYPES_COMPETITIONS:["id_type_competition","nom_type"],SAISON:["id_saison","nom_saison","date_debut","date_fin","id_statut_saison"],STATUTS_SAISON:["id_statut_saison","nom_statut","statut"],CATEGORIES_AGE:["id_categorie_age","nom_categorie_age","age_min","age_max"],CATEGORIES_COMPETITION:["id_categorie_competition","nom_categorie","age_min","age_max","sexe","poids_min","poids_max"],SEXES:["id_sexe","nom_sexe"],TYPES_PHASES:["id_type_phase","nom_type_phase"],MODES_PHASES:["id_mode_phase","nom_mode_phase"],TYPES_UNITES_COMPETITION:["id_type_unite_competition","nom_type_unite_competition"],TYPES_AFFECTATIONS_PHASES:["id_type_affectation_phase","nom_type_affectation_phase"],TYPES_RESULTATS:["id_type_resultat","nom_resultat"],STATUTS_RESULTATS:["id_statut_resultat","nom_statut_resultat"],DECISIONS_RESULTATS:["id_decision_resultat","nom_decision_resultat"],TYPES_DISTINCTIONS:["id_type_distinction","nom_type_distinction","cible_autorisee"],TYPES_ACTEURS:["id_type_acteur","nom_type_acteur","source_donnees"],FONCTIONS:["id_fonction","nom_fonction"],STATUTS_AFFILIATION:["id_statut_affiliation","nom_statut_affiliation"],PARAMETRES_SYSTEME:["cle_parametre","valeur_parametre"]} as const
export type Reference=keyof typeof refSchema
export type Issue={source:string;message:string;blocking?:boolean}
export type Source={tables:Partial<Record<Entity,Table>>;refs:Partial<Record<Reference,Row[]>>;actors:Record<string,Row[]>;clubs:Row[];affiliations:Row[];issues:Issue[]}
export type Option={id:string;label:string;[key:string]:string}
export type View={id:string;entity:Entity;version:string;values:Row;label:string;status:string;labels:Row;anomaly:string;rowKey:string;readOnly?:boolean}
export type Dataset={competition:View|null;entities:Partial<Record<Entity,View[]>>;references:Record<string,Option[]>;issues:Issue[];capabilities:{combats:boolean;prestations:boolean;message:string;eventFormatColumn:boolean};defaultSeasonId:string}
export const normalize=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase().replace(/[\s-]+/g,"_")
export const isActive=(row:Row)=>!["INACTIF","INACTIVE","SUPPRIMEE","RETIRE","ANNULE","ANNULEE"].includes(normalize(row.statut||row.statut_participation||row.statut_match||"ACTIF"))
export const idField=(entity:Entity)=>schema[entity][0]
export const rows=(source:Source,entity:Entity)=>source.tables[entity]?.rows||[]
export const byId=(source:Source,entity:Entity,id:string)=>rows(source,entity).find(r=>r[idField(entity)]===id)
export const isEntity=(value:string):value is Entity=>Object.hasOwn(schema,value)
export const isSection=(value:string):value is Section=>Object.hasOwn(sections,value)
export const civilDate=(value:string)=>{try{return formatDateFromSheet(value)}catch{return ""}}
export function inputDate(value:string,field:string,optional=false){if(!value&&optional)return "";try{return formatDateForSheet(value)}catch{throw new ActorError("VALIDATION","Date civile invalide.",422,{[field]:"Saisissez une date valide."})}}
export function nextId(entity:Entity,year:string,existing:Row[]){
 const codes:Record<Entity,string>={competition:"COMP",epreuve:"EPR",engagement:"PAR",unite:"UNI",phase:"PHA",groupe:"GRP",groupeUnite:"AFG",affectation:"PHU",combat:"MAT",resultat:"RES",classement:"CLA",intervenant:"INV",distinction:"DST",prestation:"PRE",resultatPrestation:"RPR"}
 const prefix=`FECOT-${codes[entity]}-${year}-`,pattern=new RegExp(`^${prefix}(\\d+)$`);let max=0
 for(const row of existing){const match=pattern.exec(row[idField(entity)]);if(match)max=Math.max(max,Number(match[1]))}
 if(!/^\d{4}$/.test(year)||!Number.isSafeInteger(max)||max>=999999)throw new ActorError("ID_EXHAUSTED","Série d'identifiants indisponible.",409)
 return prefix+String(max+1).padStart(6,"0")
}
export function scopeRows(source:Source,competitionId:string):Source{
 const owned=new Set<Entity>(["competition","epreuve","engagement","unite","phase","combat","classement","intervenant","distinction","prestation"]),tables={...source.tables}
 for(const entity of Object.keys(tables) as Entity[])if(owned.has(entity)){const table=tables[entity]!;tables[entity]={...table,rows:table.rows.filter(r=>r.id_competition===competitionId)}}
 const phaseIds=new Set(tables.phase?.rows.map(r=>r.id_phase_competition)),matchIds=new Set(tables.combat?.rows.map(r=>r.id_match)),prestationIds=new Set(tables.prestation?.rows.map(r=>r.id_prestation))
 for(const [entity,ids,key]of [["groupe",phaseIds,"id_phase_competition"],["affectation",phaseIds,"id_phase_competition"],["resultat",matchIds,"id_match"],["resultatPrestation",prestationIds,"id_prestation"]] as const){const table=tables[entity];if(table)tables[entity]={...table,rows:table.rows.filter(r=>ids.has(r[key]))}}
 const groupIds=new Set(tables.groupe?.rows.map(r=>r.id_groupe)),legacy=tables.groupeUnite
 if(legacy)tables.groupeUnite={...legacy,rows:legacy.rows.filter(r=>groupIds.has(r.id_groupe))}
 return {...source,tables}
}
