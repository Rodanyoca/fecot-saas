import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {nextId,scopeRows,schema,type Source,type Entity,type Row} from "../lib/competitions/model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {athleteCompatibility,checkGroup,parseValues,phaseAssignments,sportFormat} from "../lib/competitions/rules.ts"
const table=(entity:Entity,rows:Row[])=>({headers:[...schema[entity]],rows,values:[[...schema[entity]],...rows.map(r=>schema[entity].map(k=>r[k]||""))]})
function source():Source{return {tables:{},actors:{},clubs:[],affiliations:[],issues:[],refs:{DISCIPLINES:[{id_discipline:"TEST-K",nom_discipline:"Kyorugi"},{id_discipline:"TEST-P",nom_discipline:"Poomsae"}],TYPES_COMPETITIONS:[{id_type_competition:"TEST-C",nom_type:"Test officiel",format:"WT_KYORUGI_BEST_OF_THREE"}],SEXES:[{id_sexe:"TEST-M",nom_sexe:"MASCULIN"},{id_sexe:"TEST-F",nom_sexe:"FEMININ"},{id_sexe:"TEST-X",nom_sexe:"MIXTE"}],CATEGORIES_AGE:[{id_categorie_age:"TEST-J",nom_categorie_age:"Junior Test",age_min:"15",age_max:"17"}],MODES_PHASES:[{id_mode_phase:"TEST-G",nom_mode_phase:"GROUPES"},{id_mode_phase:"TEST-E",nom_mode_phase:"ELIMINATION_DIRECTE"}]}}}
test("competition identifiers retain zero padding, ignore legacy keys and refuse exhaustion",()=>{
 assert.equal(nextId("competition","2026",[{id_competition:"OLD"},{id_competition:"FECOT-COMP-2026-000009"}]),"FECOT-COMP-2026-000010")
 assert.throws(()=>nextId("combat","2026",[{id_match:"FECOT-MAT-2026-999999"}]))
})
test("competition scope filters before projections through phase, group and match relations",()=>{
 const s=source();s.tables.competition=table("competition",[{id_competition:"A"},{id_competition:"B"}]);s.tables.phase=table("phase",[{id_phase_competition:"PA",id_competition:"A"},{id_phase_competition:"PB",id_competition:"B"}]);s.tables.groupe=table("groupe",[{id_groupe:"GA",id_phase_competition:"PA"},{id_groupe:"GB",id_phase_competition:"PB"}]);s.tables.combat=table("combat",[{id_match:"MA",id_competition:"A"},{id_match:"MB",id_competition:"B"}]);s.tables.resultat=table("resultat",[{id_resultat:"RA",id_match:"MA"},{id_resultat:"RB",id_match:"MB"}]);
 const scoped=scopeRows(s,"A");assert.equal(scoped.tables.competition?.rows.length,1);assert.deepEqual(scoped.tables.groupe?.rows.map(r=>r.id_groupe),["GA"]);assert.deepEqual(scoped.tables.resultat?.rows.map(r=>r.id_resultat),["RA"]);assert.equal(s.tables.resultat.rows.length,2)
})
test("WT age compatibility is based on competition year, not birthday",()=>{
 const s=source(),competition={date_debut:"2026-01-02"},event={id_sexe:"TEST-M",id_categorie_age:"TEST-J"},athlete={id_sexe:"TEST-M",date_de_naissance:"2011-12-31"}
 assert.doesNotThrow(()=>athleteCompatibility(s,competition,event,athlete))
 assert.throws(()=>athleteCompatibility(s,competition,event,{...athlete,date_de_naissance:"2012-01-01"}))
 assert.throws(()=>athleteCompatibility(s,competition,event,{...athlete,id_sexe:"TEST-F"}))
 assert.throws(()=>athleteCompatibility(s,competition,event,{...athlete,date_de_naissance:""}))
})
test("unavailable official weighing is never inferred from a category label",()=>{
 const s=source();s.refs.CATEGORIES_COMPETITION=[{id_categorie_competition:"TEST-W",nom_categorie:"Test poids",poids_max:"55"}]
 assert.throws(()=>athleteCompatibility(s,{date_debut:"2026-01-02"},{id_sexe:"TEST-M",id_categorie_age:"TEST-J",id_categorie_competition:"TEST-W"},{id_sexe:"TEST-M",date_naissance:"2010-06-01"}),/pesée officielle/)
})
test("a phase uses its explicit mode, never its name or type",()=>{
 const s=source(),phase={id_phase_competition:"P",nom_phase:"Finale groupes",id_mode_phase:"TEST-E"};s.tables.groupe=table("groupe",[{id_groupe:"G",id_phase_competition:"P",statut:"ACTIF"}])
 assert.doesNotThrow(()=>checkGroup(s,phase,""));assert.throws(()=>checkGroup(s,phase,"G"));assert.throws(()=>checkGroup(s,{...phase,id_mode_phase:"TEST-G"},""))
})
test("canonical inactive assignments suppress historical group membership",()=>{
 const s=source();s.tables.groupe=table("groupe",[{id_groupe:"G",id_phase_competition:"P"}]);s.tables.groupeUnite=table("groupeUnite",[{id_affectation_groupe:"OLD",id_groupe:"G",id_unite_competition:"U",statut:"ACTIF"}]);s.tables.affectation=table("affectation",[{id_phase_unite:"NEW",id_phase_competition:"P",id_unite_competition:"U",statut:"INACTIF"}]);assert.equal(phaseAssignments(s).length,1);assert.equal(phaseAssignments(s)[0].statut,"INACTIF")
})
test("sports formats are configured explicitly and cannot reuse a combat result for poomsae",()=>{
 const s=source(),competition={id_discipline:"TEST-K",id_type_competition:"TEST-C"};assert.equal(sportFormat(s,competition).combats,true)
 assert.equal(sportFormat(s,{...competition,id_discipline:"TEST-P"}).combats,false)
 s.refs.TYPES_COMPETITIONS![0].format="WT_POOMSAE_RECONNU";assert.equal(sportFormat(s,{...competition,id_discipline:"TEST-P"}).prestations,true)
 s.refs.TYPES_COMPETITIONS![0].format="";assert.equal(sportFormat(s,competition).combats,false)
})
test("unknown IDs, impossible dates and raw-field injection are rejected before writes",()=>{
 assert.throws(()=>parseValues("competition",{id_competition:"HACK"}))
 assert.throws(()=>parseValues("competition",{nom_competition:"Test",id_type_competition:"T",id_discipline:"D",id_saison:"S",date_debut:"2026-02-30",date_fin:"2026-03-01",pays:"RDC",statut:"PLANIFIEE"}))
})
