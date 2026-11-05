import {build} from "esbuild"
import {runInNewContext} from "node:vm"
import {createRequire} from "node:module"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {actorsFixture} from "./actors-fixture.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {schema,sheets,type Entity,type Section} from "../lib/competitions/model.ts"
export async function competitionsFixture({extensions=false,eventFormats=false}={}){
 const f=await actorsFixture(),state=f.state,books=state.books
 Object.assign(state.env,{FECOT_COMPETITIONS_SPREADSHEET_ID:"COMP",FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID:"STRUCTURE"})
 books.COMP=Object.fromEntries((Object.keys(schema)as Entity[]).filter(e=>extensions||!["prestation","resultatPrestation"].includes(e)).map(e=>[sheets[e],[[...schema[e],"champ_historique"]]]))
 if(eventFormats)books.COMP.COMPETITIONS_EPREUVES[0].push("format_resultat")
 books.STRUCTURE={CLUBS:[["id_club","nom_club","statut"],["TEST-C1","Club Alpha","ACTIF"],["TEST-C2","Club Beta","ACTIF"]]}
 Object.assign(books.REFS,{
  DISCIPLINES:[["id_discipline","nom_discipline"],["TEST-K","Kyorugi"],["TEST-P","Poomsae"]],
  TYPES_COMPETITIONS:[["id_type_competition","nom_type","format"],["TEST-C","Championnat Test","WT_KYORUGI_BEST_OF_THREE"],["TEST-PC","Poomsae Test","WT_POOMSAE_RECONNU"]],
  SAISON:[["id_saison","nom_saison","date_debut","date_fin","id_statut_saison"],["TEST-S26","2026","2026-01-01","2026-12-31","TEST-SA"]],STATUTS_SAISON:[["id_statut_saison","nom_statut","statut"],["TEST-SA","ACTIVE","ACTIF"]],
  CATEGORIES_AGE:[["id_categorie_age","nom_categorie_age","age_min","age_max"],["TEST-J","Junior Test","15","17"]],CATEGORIES_COMPETITION:[["id_categorie_competition","nom_categorie","age_min","age_max","sexe","poids_min","poids_max"]],
  TYPES_PHASES:[["id_type_phase","nom_type_phase"],["TEST-Q","Qualification"],["TEST-F","Finale"]],MODES_PHASES:[["id_mode_phase","nom_mode_phase"],["TEST-G","GROUPES"],["TEST-E","ELIMINATION_DIRECTE"],["TEST-O","AUTRE"]],
  TYPES_UNITES_COMPETITION:[["id_type_unite_competition","nom_type_unite_competition"],["TEST-ATH","ATHLETE"],["TEST-TEAM","EQUIPE"]],TYPES_AFFECTATIONS_PHASES:[["id_type_affectation_phase","nom_type_affectation_phase"],["TEST-INIT","ENGAGEMENT_INITIAL"],["TEST-QUAL","QUALIFICATION"]],
  TYPES_RESULTATS:[["id_resultat_sport","id_discipline","nom_resultat","points_classement","observations","id_type_resultat"],["TEST-RS","TEST-K","Manches officielles","","","TEST-RES"],["TEST-RP","TEST-P","Note officielle","","","TEST-NOTE"]],
  STATUTS_RESULTATS:[["id_statut_resultat","nom_statut_resultat"],["TEST-OFF","OFFICIEL"],["TEST-DRAFT","BROUILLON"],["TEST-CANCEL","ANNULE"]],DECISIONS_RESULTATS:[["id_decision_resultat","nom_decision_resultat"],["TEST-PTF","PTF - Score final"],["TEST-WDR","WDR - Abandon"],["TEST-DSQ","DSQ - Disqualification"]],
  TYPES_DISTINCTIONS:[["id_type_distinction","nom_type_distinction","cible_autorisee"],["TEST-GOLD","Or","UNITE"],["TEST-PERSON","Distinction individuelle","ACTEUR"]],
  TYPES_ACTEURS:[["id_type_acteur","nom_type_acteur","source_donnees"],["TEST-ATH-T","Athlète","ATHLETES"],["TEST-COA-T","Entraîneur","COACHS"],["TEST-ARB-T","Arbitre","ARBITRES"],["TEST-OFF-T","Officiel","OFFICIELS"],["TEST-MED-T","Médecin","MEDECINS"],["TEST-AUT-T","Autre acteur","AUTRES"]],
  FONCTIONS:[["id_fonction","nom_fonction"],["TEST-FUNC","Fonction Test"]],STATUTS_AFFILIATION:[["id_statut_affiliation","nom_statut_affiliation"],["TEST-ACT","ACTIF"],["TEST-END","TERMINE"]],
 })
 books.AFF.ATHLETE_AFFILIATIONS=[["id_affiliation_athlete","id_athlete","id_club","date_debut","date_fin","id_statut_affiliation","observations"]]
 const transport=Reflect.get(state,"sheets"),clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value))
 let gateBook="",gate:Promise<void>|null=null,startedResolve:()=>void=()=>{},release:()=>void=()=>{}
 transport.spreadsheets.values.batchGet=async(input:{spreadsheetId:string;ranges:string[]})=>{
  state.reads.push(`${input.spreadsheetId}:${input.ranges.join(",")}`)
  if(state.failRead===input.spreadsheetId||state.failConfirm&&state.wrote)throw Object.assign(Error("PRIVATE-GOOGLE-TOKEN"),{response:{status:Reflect.get(state,"googleErrorStatus"),data:{error:{message:"PRIVATE-GOOGLE-TOKEN"}}}})
  const values=input.ranges.map(range=>clone(books[input.spreadsheetId]?.[range.match(/^'([^']+)'/)![1]]||[]))
  if(gateBook===input.spreadsheetId){gateBook="";startedResolve();await gate}
  return {data:{valueRanges:values.map(values=>({values}))}}
 }
 const metadataReads:string[]=[]
 transport.spreadsheets.get=async(input:{spreadsheetId:string})=>{metadataReads.push(input.spreadsheetId);if(state.failRead===input.spreadsheetId)throw Error("Synthetic metadata failure");return {data:{sheets:Object.keys(books[input.spreadsheetId]||{}).map((title,i)=>({properties:{title,sheetId:i+1}}))}}}
 type Cell={userEnteredValue?:{stringValue?:string}}
 type Batch={spreadsheetId:string;requestBody:{requests:{appendCells?:{sheetId:number;rows:{values:Cell[]}[]};updateCells?:{range:{sheetId:number;startRowIndex:number;startColumnIndex:number};rows:{values:Cell[]}[]}}[]}}
 transport.spreadsheets.batchUpdate=async(input:Batch)=>{
  if(state.failWrite)throw Error("Synthetic write denied");if(state.writeGate)await state.writeGate
  const book=clone(books[input.spreadsheetId]),names=Object.keys(book)
  for(const item of input.requestBody.requests){
   if(item.appendCells){const name=names[item.appendCells.sheetId-1];if(!name)throw Error("Missing sheet");for(const row of item.appendCells.rows)book[name].push(row.values.map(c=>c.userEnteredValue?.stringValue||""))}
   else if(item.updateCells){const range=item.updateCells.range,name=names[range.sheetId-1];if(!book[name]?.[range.startRowIndex])throw Error("Missing row");item.updateCells.rows.forEach((row,i)=>row.values.forEach((cell,j)=>{book[name][range.startRowIndex+i][range.startColumnIndex+j]=cell.userEnteredValue?.stringValue||""}))}
   else throw Error("Unknown request")
  }
  books[input.spreadsheetId]=book;state.writes.push(input);state.wrote=true;return {data:{}}
 }
 const mocks:Record<string,string>={"server-only":"","next/server":"export const NextResponse={json:(body,options)=>Response.json(body,options)}","../auth":"export const getSession=async()=>{state.checks++;if(state.failSecurity)throw Error('Security source unavailable');return state.loggedIn?{doitChangerMotDePasse:false}:null};export const getNavigationAccess=async()=>({'AUT-SPT:READ':state.canRead,'AUT-SPT:WRITE':state.canWrite})","../territorial-store":"export const sheetsClient=()=>state.sheets;export const required=k=>{if(!state.env[k])throw Error('Missing config');return state.env[k]}"}
 const bundle=await build({stdin:{contents:'export * from "./lib/competitions/api";export * from "./lib/competitions/store";',resolveDir:process.cwd()},bundle:true,write:false,format:"cjs",platform:"node",plugins:[{name:"offline-google-auth",setup(b){b.onResolve({filter:/.*/},a=>Object.hasOwn(mocks,a.path)?{path:a.path,namespace:"mock"}:undefined);b.onLoad({filter:/.*/,namespace:"mock"},a=>({contents:mocks[a.path],loader:"js"}))}}]})
 type Api={competitionsGet:(request:Request,id?:string,section?:string)=>Promise<Response>;competitionsWrite:(request:Request,id?:string,section?:string)=>Promise<Response>;invalidateCompetitionSource:()=>void}
 const diagnostics:string[]=[]
 const module={exports:{} as Api};runInNewContext(bundle.outputFiles[0].text,{module,exports:module.exports,state,process:{env:state.env},require:createRequire(import.meta.url),URL,Request,Response,Buffer,console:{error:(...args:unknown[])=>diagnostics.push(args.map(String).join(" "))},setTimeout,clearTimeout})
 const api=module.exports
 const read=(id?:string,section:Section="general",query="")=>api.competitionsGet(new Request(`http://offline.invalid/api/competitions${query}`),id,section)
 const write=(entity:Entity,values:unknown,id?:string,section:Section="general",editingId?:string,version?:string,reviewRankings=false)=>api.competitionsWrite(new Request(`http://offline.invalid/api/competitions${editingId?`?recordId=${encodeURIComponent(editingId)}`:""}`,{method:editingId?"PUT":"POST",body:JSON.stringify({entity,values,...(version?{version}:{}),...(reviewRankings?{reviewRankings:true}:{})})}),id,section)
 const competition={nom_competition:"Compétition Synthétique",numero_edition:"1",id_type_competition:"TEST-C",id_discipline:"TEST-K",id_saison:"TEST-S26",date_debut:"2026-06-01",date_fin:"2026-06-03",pays:"CD",lieu:"Lieu Test",statut:"PLANIFIEE",observations:""}
 const epreuve={nom_epreuve:"Épreuve Test",id_discipline:"TEST-K",id_categorie_age:"TEST-J",id_sexe:"FECOT-SEX-001",id_categorie_competition:"",statut:"ACTIF",observations:""}
 const seedActors=async()=>{for(let i=0;i<2;i++)await f.write("athletes",{...f.input,nom_complet:`Athlète Test ${i+1}`,date_naissance:"2010-12-31",numero_passeport:"PRIVATE-PASSPORT"});books.AFF.ATHLETE_AFFILIATIONS.push(["TEST-AF1","ATH00001","TEST-C1","2026-01-01","","TEST-ACT",""],["TEST-AF2","ATH00002","TEST-C1","2026-01-01","","TEST-ACT",""])}
 const command=async(entity:Entity,values:unknown,id?:string,section:Section="general")=>{const response=await write(entity,values,id,section),json=await response.json();if(!response.ok)throw Error(`${response.status}: ${JSON.stringify(json)}`);return json.confirmed[0].id as string}
 const setup=async()=>{
  await seedActors();const id=await command("competition",competition),event=await command("epreuve",epreuve,id,"epreuves"),phase=await command("phase",{id_epreuve_competition:event,id_type_phase:"TEST-Q",id_mode_phase:"TEST-G",numero_phase:"1",nom_phase:"Phase Test",statut:"ACTIF"},id,"structure"),group=await command("groupe",{id_phase_competition:phase,nom_groupe:"Groupe Test",statut:"ACTIF"},id,"structure")
  const engagement={id_epreuve_competition:event,id_type_unite_competition:"TEST-ATH",id_club:"TEST-C1",id_athlete:"ATH00001",id_phase_competition:phase,id_groupe:group,id_type_affectation_phase:"TEST-INIT",date_inscription:"2026-05-01",statut_participation:"INSCRIT",observations:""}
  await command("engagement",engagement,id,"engagements");await command("engagement",{...engagement,id_athlete:"ATH00002"},id,"engagements")
  const data=await (await read(id,"engagements")).json(),units=data.entities.unite.map((r:{id:string})=>r.id)as string[]
  return {id,event,phase,group,units,engagement}
 }
 const blockRead=(book="COMP")=>{gateBook=book;gate=new Promise<void>(resolve=>{release=resolve});const started=new Promise<void>(resolve=>{startedResolve=resolve});return {started,release:()=>release()}}
 return {...f,api,readCompetition:read,writeCompetition:write,command,setup,seedActors,competition,epreuve,metadataReads,blockRead,diagnostics}
}
