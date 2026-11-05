// Metadata only, readonly scope, bounded request, no identities or private errors printed.
import nextEnv from "@next/env"
import {google} from "googleapis"
nextEnv.loadEnvConfig(process.cwd(),false,{info:()=>{},error:()=>{}})
const required=["GOOGLE_CLIENT_EMAIL","GOOGLE_PRIVATE_KEY","FECOT_COMPETITIONS_SPREADSHEET_ID"]
const missing=required.filter(key=>!process.env[key]?.trim())
if(missing.length){console.log(JSON.stringify({status:"CONFIG_MISSING",variables:missing}));process.exitCode=1}
else{
 const auth=new google.auth.JWT({email:process.env.GOOGLE_CLIENT_EMAIL,key:process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,"\n"),scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]})
 try{const result=await google.sheets({version:"v4",auth}).spreadsheets.get({spreadsheetId:process.env.FECOT_COMPETITIONS_SPREADSHEET_ID,fields:"sheets(properties(title))"},{timeout:15000,retry:false});console.log(JSON.stringify({status:"READABLE",sheets:result.data.sheets?.map(s=>s.properties.title)}))}
 catch(error){const reasons=[...(error?.response?.data?.error?.errors||[]),...(error?.response?.data?.error?.details||[])].map(item=>item.reason),googleReason=["forbidden","accessNotConfigured","SERVICE_DISABLED","ACCESS_TOKEN_SCOPE_INSUFFICIENT","insufficientPermissions","rateLimitExceeded","userRateLimitExceeded","quotaExceeded"].find(reason=>reasons.includes(reason))||null;console.log(JSON.stringify({status:"UNAVAILABLE",httpStatus:typeof error?.response?.status==="number"?error.response.status:null,googleReason}));process.exitCode=1}
}
