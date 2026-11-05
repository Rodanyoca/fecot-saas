/* eslint-env node */
import nextEnv from "@next/env"
import { google } from "googleapis"
import { USER_HEADERS, USERS_SHEET, USER_AUTHORIZATION_HEADERS, USER_AUTHORIZATIONS_SHEET, AUTH_ATTEMPT_HEADERS, AUTH_ATTEMPTS_SHEET, AUDIT_LOG_HEADERS, AUDIT_LOG_SHEET } from "../lib/users/types.ts"
import { assertExactHeaders } from "../lib/users/validation.ts"

nextEnv.loadEnvConfig(process.cwd())
const spreadsheetId = (process.env.FECOT_USERS_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_USERS_SPREADSHEET_ID)?.trim()
if (!spreadsheetId) throw new Error("FECOT_USERS_SPREADSHEET_ID est manquant.")
const email=process.env.GOOGLE_CLIENT_EMAIL?.trim(),key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,"\n")
if(!email||!key)throw new Error("Identifiants Google Sheets absents.")
const auth=new google.auth.JWT({email,key,scopes:["https://www.googleapis.com/auth/spreadsheets"]})
const sheets=google.sheets({version:"v4",auth})
const schema=new Map([[USERS_SHEET,USER_HEADERS],[USER_AUTHORIZATIONS_SHEET,USER_AUTHORIZATION_HEADERS],[AUTH_ATTEMPTS_SHEET,AUTH_ATTEMPT_HEADERS],[AUDIT_LOG_SHEET,AUDIT_LOG_HEADERS]])
async function main(){
 const metadata=await sheets.spreadsheets.get({spreadsheetId,fields:"sheets.properties(title)"},{timeout:15000,retry:false})
 const existing=new Set(metadata.data.sheets.map(sheet=>sheet.properties.title))
 const names=[...schema.keys()],present=names.filter(name=>existing.has(name)),missing=names.filter(name=>!existing.has(name))
 const response=present.length?await sheets.spreadsheets.values.batchGet({spreadsheetId,ranges:present.map(name=>"'"+name+"'!A:ZZ")},{timeout:15000,retry:false}):null
 const empty=[]
 for(const [index,name] of present.entries()){
  const values=response.data.valueRanges[index].values||[]
  if(values.some(row=>row.some(value=>String(value??"").trim()))){
   assertExactHeaders(name,(values[0]||[]).map(value=>String(value??"").trim()),schema.get(name))
  }else empty.push(name)
 }
 console.log(JSON.stringify({mode:process.argv.includes("--execute")?"EXECUTION":"DRY_RUN",createSheets:missing,initializeHeaders:[...missing,...empty],preserved:present.filter(name=>!empty.includes(name))},null,2))
 if(!process.argv.includes("--execute")){console.log("Aucune écriture effectuée. Ajouter --execute après vérification du classeur.");return}
 if(missing.length)await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:missing.map(title=>({addSheet:{properties:{title}}}))}},{timeout:15000,retry:false})
 if(missing.length||empty.length)await sheets.spreadsheets.values.batchUpdate({spreadsheetId,requestBody:{valueInputOption:"RAW",data:[...missing,...empty].map(name=>({range:"'"+name+"'!A1",values:[[...schema.get(name)]]}))}},{timeout:15000,retry:false})
 console.log("Schéma préparé. Aucun compte ni secret créé.")
}
main().catch(error=>{console.error(error?.code==="SCHEMA_INVALID"?"Schéma existant incompatible : aucune migration automatique.":"Préparation impossible. Vérifier configuration, accès et réseau.");process.exitCode=1})
