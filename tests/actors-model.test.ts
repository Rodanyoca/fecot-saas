import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {actorConfig,actorKinds,actorValues,parseActorTable,prepareActor,projectActor,type ActorKind} from "../lib/actors/model.ts"

// Exact physical variants observed in FECOT. Data rows below are synthetic only.
export const actorHeaders:Record<ActorKind,string[]>={
 athletes:["id_athlete","id_national","id_wt","nom_complet","id_sexe","date_de_naissance","lieu_de_naissance","nationalite","telephone","email","adresse","numero_passeport","date_delivrance_passeport","date_expiration_passeport","statut","observations","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url","niveau"],
 coachs:["id_coach","id_national","id_wt","nom_complet","id_sexe","date_naissance","lieu_naissance","nationalite","id_niveau","telephone","email","adresse","numéro_passeport","date_de_delivrance_passeport","date_expiration passeport","statut","observation ","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"],
 arbitres:["id_arbitre","id_national","id_wt","nom_complet","id_sexe","date_naissance","nationalite","id_grade_arbitre","telephone","email","adresse","numéro_passeport","date_de_delivrance_passeport","date_expiration passeport","date_affiliation","statut","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"],
 officiels:["id_officiel","id_national","id_wt","nom_complet","id_sexe","date_de_naissance","lieu_de_naissance","nationalite","telephone","email","adresse","numero_passeport","date_de_delivrance_passeport","date_expiration_passeport","statut","observations","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"],
 medecins:["id_medecin","id_national","id_wt","nom_complet","id_sexe","date_naissance","nationalite","id_specialite","telephone","email","adresse","numéro_passeport","date_de_delivrance_passeport","date_expiration passeport","statut","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"],
 "autres-acteurs":["id_autre_acteur","nom_complet","id_sexe","date_de_naissance","lieu_de_naissance","nationalite","id_type_autre_acteur","telephone","email","adresse","numero_passeport","date_de_delivrance_passeport","date_expiration_passeport","statut","observations","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url","entite"],
}
export const actorRefs={SEXES:[{id:"FECOT-SEX-001",label:"MASCULIN"},{id:"FECOT-SEX-002",label:"FEMININ"},{id:"FECOT-SEX-003",label:"MIXTE"}]}
export const actorInput={nom_complet:"Synthetic actor",id_sexe:"FECOT-SEX-001",statut:"ACTIF"}
for(const kind of actorKinds)test(`FECOT ${kind}: mapping exact, dates, WT, immutable key and private projection`,()=>{
 const table=parseActorTable([[...actorHeaders[kind],"future_column"]],actorConfig[kind].id)
 const input={...actorInput,date_naissance:"01012000",numero_passeport:"000123",date_delivrance_passeport:"02/01/2025",date_expiration_passeport:"03012026",...(kind!=="autres-acteurs"?{id_wt:"000WT",id_national:"0007"}:{})}
 const prepared=prepareActor(kind,input,table,actorRefs,undefined,"2026-11-02")
 const row={...prepared.record,[actorConfig[kind].id]:"0001",future_column:"preserve",avatar_drive_id:"image",passeport_drive_id:"private"}
 table.rows.push(row)
 const values=actorValues(row,table.headers)
 assert.equal(values.date_naissance,"2000-01-01");assert.equal(values.numero_passeport,"000123")
 const list=projectActor(kind,row,table.headers,actorRefs),detail=projectActor(kind,row,table.headers,actorRefs,true)
 assert.equal(list.id,"0001");assert.equal(list.values.numero_passeport,undefined);assert.equal(list.passportUrl,"");assert.equal(detail.values.numero_passeport,"000123");assert.match(detail.passportUrl,/\/media\/passport$/)
 const update=prepareActor(kind,{telephone:"+243 0001"},table,actorRefs,"0001","2026-11-02")
 assert.deepEqual(update.record,{telephone:"+243 0001"})
 for(const key of ["id",actorConfig[kind].id,"avatar_drive_id","passeport_drive_url"])assert.throws(()=>prepareActor(kind,{[key]:"HACK"},table,actorRefs,"0001"))
})
test("strict dates, future birth, chronology, mixed sex, wrong references and duplicate national/WT",()=>{
 const table=parseActorTable([actorHeaders.athletes],"id_athlete")
 for(const extra of [{date_naissance:"31022025"},{date_naissance:"junk01012000"},{date_naissance:"03012027"},{date_delivrance_passeport:"03012025",date_expiration_passeport:"02012025"},{id_sexe:"FECOT-SEX-003"},{id_sexe:"SEX001"},{nom_complet:""},{email:"invalid"},{statut:"OTHER"},{nom_complet:123}])assert.throws(()=>prepareActor("athletes",{...actorInput,...extra},table,actorRefs,undefined,"2026-11-02"))
 const good=prepareActor("athletes",{...actorInput,id_national:"0007",id_wt:"001"},table,actorRefs)
 table.rows.push({...good.record,id_athlete:"old"})
 assert.throws(()=>prepareActor("athletes",{...actorInput,id_wt:"001"},table,actorRefs))
 assert.throws(()=>prepareActor("athletes",{...actorInput,id_national:"0007"},table,actorRefs))
})
test("empty optional references stay empty; historical value preserved but new unknown ID rejected",()=>{
 const table=parseActorTable([actorHeaders.coachs],"id_coach")
 assert.doesNotThrow(()=>prepareActor("coachs",actorInput,table,actorRefs))
 assert.throws(()=>prepareActor("coachs",{...actorInput,id_niveau:"INVENTED"},table,actorRefs))
 table.rows.push({...actorInput,id_coach:"legacy",id_niveau:"OLD"})
 assert.doesNotThrow(()=>prepareActor("coachs",{telephone:"01"},table,actorRefs,"legacy"))
})
test("schema reorder/blanks, missing/duplicate IDs and ambiguous aliases fail explicitly",()=>{
 const table=parseActorTable([["nom_complet","","id_athlete","id_sexe","statut"],["Example","","0001","FECOT-SEX-001","ACTIF"]],"id_athlete")
 assert.equal(table.rows[0].id_athlete,"0001")
 assert.throws(()=>parseActorTable([["id_athlete","id_athlete"]],"id_athlete"))
 assert.throws(()=>parseActorTable([["id_athlete","nom_complet"],["","Name"]],"id_athlete"))
 assert.throws(()=>actorValues({},["date_naissance","date_de_naissance"]))
 assert.throws(()=>prepareActor("athletes",actorInput,table,actorRefs,"missing"))
})

test("athlete level is removed from fields/projections and rejected on writes; coach level remains",()=>{
 const headers=actorHeaders.athletes.filter(key=>key!=="niveau"),table=parseActorTable([headers],"id_athlete")
 const prepared=prepareActor("athletes",actorInput,table,actorRefs)
 assert.equal(prepared.record.niveau,undefined)
 const legacyTable=parseActorTable([actorHeaders.athletes],"id_athlete")
 const actor=projectActor("athletes",{...actorInput,id_athlete:"ATH00001",niveau:"old value"},legacyTable.headers,actorRefs,true)
 assert.equal(actor.values.niveau,undefined);assert.equal(actor.extraLabel,"")
 assert.throws(()=>prepareActor("athletes",{...actorInput,niveau:"new value"},legacyTable,actorRefs))
 const coachTable=parseActorTable([actorHeaders.coachs],"id_coach")
 assert.doesNotThrow(()=>prepareActor("coachs",{...actorInput,id_niveau:""},coachTable,actorRefs))
})

test("other actor lists expose the required phone without adding contacts to other lists",()=>{
 const row={...actorInput,telephone:"000123",email:"test@example.invalid",numero_passeport:"0001"}
 const other=projectActor("autres-acteurs",{...row,id_autre_acteur:"OTHER"},actorHeaders["autres-acteurs"],actorRefs)
 assert.equal(other.values.telephone,"000123");assert.equal(other.values.email,undefined);assert.equal(other.values.numero_passeport,undefined)
 const athlete=projectActor("athletes",{...row,id_athlete:"ATH00001"},actorHeaders.athletes,actorRefs)
 assert.equal(athlete.values.telephone,undefined)
})
