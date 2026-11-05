import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node native TypeScript imports.
import { mapUsersTable, userCellUpdates } from "../../lib/users/sheet-table.ts"
test("users mapping follows reordered headers and preserves booleans and empty cells",()=>{
 const table=mapUsersTable([["email","est_super_admin","id_user"],["test@example.org",true,"TEST"],[],["two@example.org",false,"OTHER"]])
 assert.deepEqual(table.headers,["email","est_super_admin","id_user"])
 assert.equal(table.rows.length,2)
 assert.equal(table.rows[0].est_super_admin,"TRUE")
 assert.equal(table.rows[1].est_super_admin,"FALSE")
 const gap=mapUsersTable([["email","","id_user"],["test@example.org","","TEST"]]);assert.deepEqual(gap.headers,["email","","id_user"]);assert.equal(gap.rows[0].id_user,"TEST")
 assert.throws(()=>mapUsersTable([["email","email"]]),/dupliqu/)
})
test("updates use actual columns and row numbers including blank rows",()=>{
 const values=[["email","id_user","derniere_connexion"],[],["test@example.org","TEST",""]]
 assert.deepEqual(userCellUpdates("USERS",values,"id_user","TEST",{derniere_connexion:"2026-10-12T12:00:00Z"}),[{range:"'USERS'!C3",values:[["2026-10-12T12:00:00Z"]]}])
 assert.throws(()=>userCellUpdates("USERS",values,"id_user","TEST",{unknown:"x"}),/absente/)
 assert.throws(()=>userCellUpdates("USERS",[...values,values[2]],"id_user","TEST",{email:"x"}),/ambigu/)
})
