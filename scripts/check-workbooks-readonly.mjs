// Metadata only: no business rows, writes, sharing changes or displayed secrets.
import nextEnv from "@next/env"
import {google} from "googleapis"
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}})
const books=[
 ["FECOT_REFERENTIELS_SPREADSHEET_ID","00_FECOT_REFERENTIEL","active"],
 ["FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID","01_FECOT_STRUCTURE_TERRITORIALE","active"],
 ["FECOT_ACTEURS_SPREADSHEET_ID","02_FECOT_ACTEURS","prepared"],
 ["FECOT_AFFILIATIONS_SPREADSHEET_ID","03_FECOT_AFFILIATIONS","prepared"],
 ["FECOT_LICENCES_SPREADSHEET_ID","04_FECOT_LICENCE","prepared"],
 ["FECOT_COMPETITIONS_SPREADSHEET_ID","05_FECOT_COMPETITIONS","prepared"],
 ["FECOT_EQUIPES_NATIONALES_SPREADSHEET_ID","06_FECOT_EQUIPE_NATIONALE","prepared"],
 ["FECOT_ACTIVITES_SPREADSHEET_ID","07_FECOT_ACTIVITES","prepared"],
 ["FECOT_DOCUMENTS_SPREADSHEET_ID","08_FECOT_DOCUMENTS","prepared"],
 ["FECOT_USERS_SPREADSHEET_ID","09_FECOT_USERS","active"],
]
if(!process.env.GOOGLE_CLIENT_EMAIL?.trim()||!process.env.GOOGLE_PRIVATE_KEY?.trim())throw new Error("Compte Google FECOT non configure (valeurs non affichees).")
const auth=new google.auth.JWT({email:process.env.GOOGLE_CLIENT_EMAIL,key:process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,"\n"),scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]})
const sheets=google.sheets({version:"v4",auth}),results=[]
for(const [variable,title,module] of books){
 const id=process.env[variable]?.trim()
 if(!id){results.push({variable,module,status:"MISSING"});continue}
 if(!/^[A-Za-z0-9_-]+$/.test(id)){results.push({variable,module,status:"INVALID_ID"});continue}
 try{
  const response=await sheets.spreadsheets.get({spreadsheetId:id,fields:"properties(title),sheets(properties(title))"},{timeout:15000,retry:false})
  const matches=response.data.properties?.title===title
  results.push({variable,module,status:matches?"READABLE":"WRONG_WORKBOOK",expected:title,sheets:matches?response.data.sheets?.map(sheet=>sheet.properties?.title):undefined})
 }catch(error){results.push({variable,module,status:"UNAVAILABLE",httpStatus:typeof error?.code==="number"?error.code:undefined})}
}
console.log(JSON.stringify({readOnly:true,metadataOnly:true,preparedDoesNotMeanImplemented:true,results},null,2))
if(results.some(result=>result.status!=="READABLE"))process.exitCode=1
