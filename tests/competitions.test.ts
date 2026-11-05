import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {competitionsFixture} from "./competitions-fixture.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {schema} from "../lib/competitions/model.ts"
test("Google access failures identify the source and competition log without leaking provider details",async()=>{
 const f=await competitionsFixture();f.state.failRead="COMP";Reflect.set(f.state,"googleErrorStatus",403)
 const response=await f.readCompetition(undefined,"general","?fresh=1"),json=await response.json()
 assert.equal(response.status,503);assert.equal(json.error.code,"GOOGLE_ACCESS_DENIED")
 assert.match(json.error.message,/FECOT_COMPETITIONS_SPREADSHEET_ID/)
 assert.equal(JSON.stringify(json).includes("PRIVATE-GOOGLE-TOKEN"),false)
 assert.ok(f.diagnostics.some(line=>line.includes("[competitions] GOOGLE_ACCESS_DENIED")))
 assert.equal(f.diagnostics.some(line=>line.includes("[actors]")||line.includes("PRIVATE-GOOGLE-TOKEN")),false)
 assert.equal(f.state.writes.length,0)
})
test("legacy civil dates preserve affiliation options without leaking all clubs into consultation",async()=>{
 const f=await competitionsFixture(),s=await f.setup(),table=f.state.books.COMP.COMPETITIONS
 table[1][table[0].indexOf("date_debut")]="01/06/2026"
 const response=await f.readCompetition(s.id,"engagements","?options=1&fresh=1"),json=await response.json()
 assert.equal(response.status,200);assert.equal(json.references.athletes.length,2);assert.deepEqual(JSON.parse(json.references.athletes[0].clubs),["TEST-C1"])
 const consultation=await(await f.readCompetition(s.id,"engagements","?fresh=1")).json();assert.deepEqual(consultation.references.clubs,[]);assert.equal(consultation.competition.values.date_debut,"2026-06-01")
})
test("intervenants and distinctions retain actor type, enforce targets and protect dependent identities",async()=>{
 const f=await competitionsFixture(),s=await f.setup();await f.write("coachs")
 const person={id_type_acteur:"TEST-COA-T",id_acteur:"COA-0001",id_unite_competition:s.units[0],id_fonction:"TEST-FUNC",role_participant:"Encadrement",statut:"ACTIF"}
 const id=await f.command("intervenant",person,s.id,"intervenants")
 assert.equal((await f.writeCompetition("intervenant",person,s.id,"intervenants")).status,409)
 const row=(await(await f.readCompetition(s.id,"intervenants")).json()).entities.intervenant[0]
 assert.equal(row.values.type_participant,"COACH");assert.equal(row.values.id_club,"TEST-C1")
 const award={id_epreuve_competition:s.event,id_type_distinction:"TEST-PERSON",id_unite_competition:"",id_type_acteur:"TEST-COA-T",id_acteur:"COA-0001",id_phase_competition:s.phase,id_match:"",date_attribution:"2026-06-02",statut:"ACTIF"}
 assert.equal((await f.writeCompetition("distinction",{...award,id_unite_competition:s.units[0]},s.id,"distinctions")).status,422)
 await f.command("distinction",award,s.id,"distinctions")
 assert.equal((await f.writeCompetition("distinction",award,s.id,"distinctions")).status,409)
 assert.equal((await f.writeCompetition("intervenant",{...person,id_type_acteur:"TEST-ATH-T",id_acteur:"ATH00001"},s.id,"intervenants",id,row.version)).status,409)
 const result=await(await f.readCompetition(s.id,"distinctions")).json();assert.equal(result.entities.distinction.length,1);assert.equal(result.entities.distinction[0].values.id_acteur,"COA-0001")
})
test("a corrupt unit engagement link is rejected before a sporting write",async()=>{
 const f=await competitionsFixture(),s=await f.setup(),table=f.state.books.COMP.COMPETITIONS_UNITES
 table[1][table[0].indexOf("id_participation")]="UNKNOWN"
 const before=f.state.writes.length
 assert.equal((await f.writeCompetition("combat",{id_phase_competition:s.phase,id_groupe:s.group,id_unite_a:s.units[0],id_unite_b:s.units[1],date_match:"2026-06-01",statut_match:"PLANIFIE"},s.id,"combats")).status,422)
 assert.equal(f.state.writes.length,before)
})
test("competitions: fresh READ/WRITE controls precede business data and malformed routes",async()=>{
 const f=await competitionsFixture();f.state.loggedIn=false;assert.equal((await f.readCompetition()).status,401);assert.equal((await f.writeCompetition("competition",f.competition)).status,401)
 f.state.loggedIn=true;f.state.canRead=false;f.state.canWrite=false;assert.equal((await f.readCompetition()).status,403);assert.equal((await f.writeCompetition("competition",f.competition)).status,403);assert.equal(f.state.reads.length,0);assert.equal(f.state.writes.length,0)
 f.state.failSecurity=true;assert.equal((await f.readCompetition()).status,503);assert.equal(f.state.reads.length,0)
})
test("empty list uses two grouped reads, shares overlapping requests and never caches rights",async()=>{
 const f=await competitionsFixture();const responses=await Promise.all([f.readCompetition(),f.readCompetition()]);assert.ok(responses.every(r=>r.ok));assert.equal(f.state.reads.length,2)
 const data=await responses[0].json();assert.deepEqual(data.entities.competition,[]);assert.equal(f.metadataReads.length,0)
 await f.readCompetition();assert.equal(f.state.reads.length,2);f.state.canRead=false;assert.equal((await f.readCompetition()).status,403);assert.equal(f.state.reads.length,2)
})
test("competition to event, phase, group and individual engagement writes related rows atomically",async()=>{
 const f=await competitionsFixture(),s=await f.setup(),data=await(await f.readCompetition(s.id,"engagements")).json()
 assert.equal(data.entities.engagement.length,2);assert.equal(data.entities.unite.length,2);assert.equal(data.entities.engagement[0].labels.id_athlete,"Athlète Test 1")
 assert.equal(data.entities.engagement[0].values.id_phase_competition,s.phase);assert.ok(!JSON.stringify(data).includes("PRIVATE-PASSPORT"));assert.ok(!JSON.stringify(data).includes("numero_passeport"))
 const before=f.state.writes.length;assert.equal((await f.writeCompetition("engagement",s.engagement,s.id,"engagements")).status,409);assert.equal(f.state.writes.length,before)
 const apiWrite=f.state.writes.find(w=>{const v=w as {requestBody?:{requests?:unknown[]}};return v.requestBody?.requests?.length===3});assert.ok(apiWrite)
 assert.equal(f.state.books.COMP.COMPETITIONS_PARTICIPANTS[1][7],"INSCRIT");assert.equal(f.state.books.COMP.COMPETITIONS_UNITES[1][8],"ACTIF")
})
test("category, foreign parent, group mode, missing weighing and collective composition fail before writes",async()=>{
 const f=await competitionsFixture(),s=await f.setup();await f.write("athletes",{...f.input,nom_complet:"Troisième Test",date_naissance:"2020-01-01"})
 const before=f.state.writes.length
 assert.equal((await f.writeCompetition("groupe",{id_phase_competition:"UNKNOWN",nom_groupe:"Étranger",statut:"ACTIF"},s.id,"structure")).status,422)
 assert.equal((await f.writeCompetition("engagement",{...s.engagement,id_club:"TEST-C2"},s.id,"engagements")).status,422)
 assert.equal((await f.writeCompetition("engagement",{...s.engagement,id_type_unite_competition:"TEST-TEAM"},s.id,"engagements")).status,503)
 assert.equal((await f.writeCompetition("engagement",{...s.engagement,id_athlete:"ATH00003"},s.id,"engagements")).status,422)
 assert.equal(f.state.writes.length,before)
 f.state.books.REFS.CATEGORIES_COMPETITION.push(["TEST-W","Poids Test","","","MASCULIN","","55"])
 const e2=await f.command("epreuve",{...f.epreuve,nom_epreuve:"Épreuve avec pesée",id_categorie_competition:"TEST-W"},s.id,"epreuves")
 const p2=await f.command("phase",{id_epreuve_competition:e2,id_type_phase:"TEST-Q",id_mode_phase:"TEST-E",numero_phase:"1",nom_phase:"Phase poids",statut:"ACTIF"},s.id,"structure")
 assert.equal((await f.writeCompetition("engagement",{...s.engagement,id_epreuve_competition:e2,id_phase_competition:p2,id_groupe:""},s.id,"engagements")).status,503)
})
test("official kyorugi result uses rounds won, rejects fake totals and preserves registration state",async()=>{
 const f=await competitionsFixture(),s=await f.setup(),match=await f.command("combat",{id_phase_competition:s.phase,id_groupe:s.group,id_unite_a:s.units[0],id_unite_b:s.units[1],date_match:"01062026",heure_match:"10:30",statut_match:"PLANIFIE"},s.id,"combats")
 const result={id_match:match,id_type_resultat:"TEST-RES",id_statut_resultat:"TEST-OFF",id_decision_resultat:"TEST-PTF",score_a:"2",score_b:"0",id_unite_vainqueur:s.units[0],observations:""}
 const before=f.state.writes.length
 assert.equal((await f.writeCompetition("resultat",{...result,score_a:"30"},s.id,"resultats")).status,422)
 assert.equal((await f.writeCompetition("resultat",{...result,id_decision_resultat:"TEST-WDR",score_a:"2",score_b:"2"},s.id,"resultats")).status,422)
 assert.equal((await f.writeCompetition("resultat",{...result,id_unite_vainqueur:s.units[1]},s.id,"resultats")).status,422);assert.equal(f.state.writes.length,before)
 await f.command("resultat",result,s.id,"resultats");assert.equal((await f.writeCompetition("resultat",result,s.id,"resultats")).status,409)
 const rows=(await(await f.readCompetition(s.id,"resultats")).json()).entities.resultat;assert.equal(rows.length,1);assert.equal(rows[0].labels.id_unite_vainqueur,"Athlète Test 1");assert.equal(f.state.books.COMP.COMPETITIONS_PARTICIPANTS[1][7],"INSCRIT")
})
test("result correction protects qualifications and explicitly revises rankings in the same transaction",async()=>{
 const f=await competitionsFixture(),s=await f.setup(),match=await f.command("combat",{id_phase_competition:s.phase,id_groupe:s.group,id_unite_a:s.units[0],id_unite_b:s.units[1],date_match:"2026-06-01",heure_match:"10:00",statut_match:"PLANIFIE"},s.id,"combats")
 await f.command("resultat",{id_match:match,id_type_resultat:"TEST-RES",id_statut_resultat:"TEST-OFF",id_decision_resultat:"TEST-PTF",score_a:"2",score_b:"1",id_unite_vainqueur:s.units[0]},s.id,"resultats")
 await f.command("classement",{id_phase_competition:s.phase,id_groupe:s.group,id_unite_competition:s.units[0],rang:"1"},s.id,"classements")
 let row=(await(await f.readCompetition(s.id,"resultats")).json()).entities.resultat[0]
 const correction={score_a:"0",score_b:"2",id_unite_vainqueur:s.units[1]}
 assert.equal((await f.writeCompetition("resultat",correction,s.id,"resultats",row.id,row.version)).status,409)
 const final=await f.command("phase",{id_epreuve_competition:s.event,id_type_phase:"TEST-F",id_mode_phase:"TEST-E",numero_phase:"2",nom_phase:"Finale",statut:"ACTIF"},s.id,"structure")
 const qualified=await f.command("affectation",{id_phase_competition:final,id_groupe:"",id_unite_competition:s.units[0],id_type_affectation_phase:"TEST-QUAL",id_phase_source:s.phase,id_match_source:match,date_affectation:"2026-06-02",statut:"ACTIF"},s.id,"structure")
 assert.equal((await f.writeCompetition("resultat",correction,s.id,"resultats",row.id,row.version,true)).status,409)
 const assignment=(await(await f.readCompetition(s.id,"structure")).json()).entities.affectation.find((r:{id:string})=>r.id===qualified)
 assert.equal((await f.writeCompetition("affectation",{statut:"INACTIF"},s.id,"structure",qualified,assignment.version)).status,200)
 const before=f.state.writes.length;assert.equal((await f.writeCompetition("resultat",correction,s.id,"resultats",row.id,row.version,true)).status,200);assert.equal(f.state.writes.length,before+1)
 const rankings=(await(await f.readCompetition(s.id,"classements")).json()).entities.classement;assert.equal(rankings[0].values.rang,"");assert.equal(rankings[0].status,"A_REVISER")
 assert.equal((await f.writeCompetition("resultat",correction,s.id,"resultats",row.id,row.version,true)).status,409)
 row=(await(await f.readCompetition(s.id,"resultats")).json()).entities.resultat[0];assert.equal(row.values.id_unite_vainqueur,s.units[1])
})
test("poomsae prestations use separate notes without an invented opponent or automatic ranking",async()=>{
 const f=await competitionsFixture({extensions:true});await f.seedActors()
 const id=await f.command("competition",{...f.competition,id_discipline:"TEST-P",id_type_competition:"TEST-PC"}),event=await f.command("epreuve",{...f.epreuve,id_discipline:"TEST-P"},id,"epreuves"),phase=await f.command("phase",{id_epreuve_competition:event,id_type_phase:"TEST-Q",id_mode_phase:"TEST-E",numero_phase:"1",nom_phase:"Passages",statut:"ACTIF"},id,"structure")
 await f.command("engagement",{id_epreuve_competition:event,id_type_unite_competition:"TEST-ATH",id_club:"TEST-C1",id_athlete:"ATH00001",id_phase_competition:phase,id_groupe:"",id_type_affectation_phase:"TEST-INIT",date_inscription:"2026-05-01",statut_participation:"INSCRIT"},id,"engagements")
 const unit=(await(await f.readCompetition(id,"engagements")).json()).entities.unite[0].id,prestation=await f.command("prestation",{id_epreuve_competition:event,id_phase_competition:phase,id_unite_competition:unit,ordre_passage:"1",date_prestation:"2026-06-01",heure_prestation:"11:00",statut:"ACTIF"},id,"prestations")
 const result={id_prestation:prestation,id_type_resultat:"TEST-NOTE",id_statut_resultat:"TEST-OFF",id_decision_resultat:"",note_officielle:"7.125",rang_officiel:"1"}
 assert.equal((await f.writeCompetition("resultatPrestation",{...result,note_officielle:"11"},id,"resultats")).status,422)
 await f.command("resultatPrestation",result,id,"resultats")
 const data=await(await f.readCompetition(id,"resultats")).json();assert.equal(data.entities.resultatPrestation[0].values.note_officielle,"7.125");assert.deepEqual(data.entities.resultat,[])
 assert.equal(f.state.books.COMP.COMPETITIONS_RESULTATS.length,1);assert.equal(f.state.books.COMP.COMPETITIONS_CLASSEMENT.length,1)
 assert.equal((await f.writeCompetition("combat",{id_phase_competition:phase,id_groupe:"",id_unite_a:unit,id_unite_b:unit,date_match:"2026-06-01",statut_match:"PLANIFIE"},id,"combats")).status,503)
})
test("missing prestation schema is explicit and never created automatically",async()=>{
 const f=await competitionsFixture(),id=await f.command("competition",{...f.competition,id_discipline:"TEST-P",id_type_competition:"TEST-PC"})
 const data=await(await f.readCompetition(id,"prestations")).json();assert.equal(data.capabilities.prestations,false);assert.ok(data.issues.some((i:{source:string})=>i.source==="PRESTATIONS"));assert.equal(f.state.books.COMP.COMPETITIONS_PRESTATIONS,undefined)
 assert.equal(f.state.writes.length,1)
})
test("invalid result references, source outages and expired versions never become successful writes",async()=>{
 const f=await competitionsFixture(),s=await f.setup(),before=f.state.writes.length
 f.state.books.REFS.TYPES_RESULTATS=[["id_resultat_sport","id_discipline","nom_resultat","points_classement","observations","id_type_resultat"],["","","VICTOIRE","2"]]
 const data=await(await f.readCompetition(s.id,"resultats","?fresh=1")).json();assert.ok(data.issues.some((i:{source:string})=>i.source==="TYPES_RESULTATS"));assert.deepEqual(data.references.TYPES_RESULTATS,[])
 f.state.failRead="COMP";assert.equal((await f.readCompetition(s.id,"general","?fresh=1")).status,503);assert.equal(f.state.writes.length,before)
})
test("overlapping creates serialize and an old in-flight read cannot refill an invalidated cache",async()=>{
 const f=await competitionsFixture(),gate=f.blockRead(),old=f.readCompetition();await gate.started
 const responses=await Promise.all([f.writeCompetition("competition",f.competition),f.writeCompetition("competition",f.competition)]);assert.deepEqual(responses.map(r=>r.status),[201,409])
 gate.release();await old;const current=await(await f.readCompetition()).json();assert.equal(current.entities.competition.length,1)
})
test("header reordering and unknown columns are preserved and confirmation failure is uncertain",async()=>{
 const f=await competitionsFixture(),id=await f.command("competition",f.competition),table=f.state.books.COMP.COMPETITIONS
 const unknown=table[0].indexOf("champ_historique");table[1][unknown]="KEEP";for(const row of table)[row[0],row[1]]=[row[1],row[0]]
 let row=(await(await f.readCompetition(id,"general","?fresh=1")).json()).competition
 assert.equal((await f.writeCompetition("competition",{observations:"Correction Test"},id,"general",id,row.version)).status,200)
 assert.equal(f.state.books.COMP.COMPETITIONS[1][unknown],"KEEP")
 row=(await(await f.readCompetition(id,"general")).json()).competition;f.state.failConfirm=true;f.state.wrote=false
 const response=await f.writeCompetition("competition",{observations:"Confirmation Test"},id,"general",id,row.version);assert.equal(response.status,503);assert.equal((await response.json()).error.uncertain,true)
})
test("foreign competition identifiers, body injection and unknown sections fail closed",async()=>{
 const f=await competitionsFixture(),s=await f.setup(),other=await f.command("competition",{...f.competition,nom_competition:"Autre Test"}),before=f.state.writes.length
 assert.equal((await f.writeCompetition("phase",{id_competition:other},s.id,"structure")).status,422)
 assert.equal((await f.writeCompetition("groupe",{id_phase_competition:s.phase,nom_groupe:"Fuite",statut:"ACTIF"},other,"structure")).status,422)
 assert.equal((await f.api.competitionsGet(new Request("http://offline.invalid/"),s.id,"unknown")).status,404);assert.equal(f.state.writes.length,before)
 const unknown=await f.readCompetition("UNKNOWN");assert.equal(unknown.status,404)
 assert.equal(f.state.books.COMP.COMPETITIONS[0][0],schema.competition[0])
})
