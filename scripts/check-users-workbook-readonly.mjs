import nextEnv from '@next/env'
import { google } from 'googleapis'
import { UsersRepository } from '../lib/users/repository.ts'
import { mapUsersTable } from '../lib/users/sheet-table.ts'
nextEnv.loadEnvConfig(process.cwd())
async function main(){
 const secret=process.env.AUTH_SECRET||'',telemetry=process.env.AUTH_TELEMETRY_HMAC_KEY||''
 if(secret.length<32||telemetry.length<32||secret===telemetry){console.error('Secrets de session/pseudonymisation absents, trop courts ou identiques.');process.exitCode=1;return}
 console.log('Secrets valides et distincts ; valeurs non affichees.')
 const auth=new google.auth.JWT({email:process.env.GOOGLE_CLIENT_EMAIL,key:process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n'),scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']})
 const sheets=google.sheets({version:'v4',auth})
 const metadata=await sheets.spreadsheets.get({spreadsheetId:process.env.FECOT_USERS_SPREADSHEET_ID,fields:'properties(title)'},{timeout:15000,retry:false})
 console.log(JSON.stringify({workbookTitle:metadata.data.properties.title}))
 const names=['USERS','USER_AUTORISATIONS','AUTH_TENTATIVES','JOURNAL_OPERATIONS']
 const res=await sheets.spreadsheets.values.batchGet({spreadsheetId:process.env.FECOT_USERS_SPREADSHEET_ID,ranges:names.map(n=>"'"+n+"'!A:ZZ")},{timeout:15000,retry:false})
 const tables=new Map(names.map((n,i)=>[n,mapUsersTable(res.data.valueRanges[i].values||[])]))
 const repo=new UsersRepository({readHeaders:async n=>tables.get(n).headers,readRows:async n=>tables.get(n).rows,appendRow:async()=>{throw Error('read only')},updateRow:async()=>{throw Error('read only')}})
 const users=await repo.getUsers(), grants=await repo.getUserAuthorizations(),attempts=await repo.getAuthAttempts(),audit=await repo.getAuditLog()
 console.log(JSON.stringify({schema:'VALID',users:users.length,activeUsers:users.filter(u=>u.statut==='ACTIF').length,superAdmins:users.filter(u=>u.estSuperAdmin).length,temporaryAccounts:users.filter(u=>u.doitChangerMotDePasse).length,authorizations:grants.length,attempts:attempts.length,auditEntries:audit.length,orphanAuthorizations:grants.filter(g=>!users.some(u=>u.idUser===g.idUser)).length}))
}
main().catch(e=>{console.error('Validation impossible ; code : '+(e?.code||'UNKNOWN'));process.exitCode=1})
