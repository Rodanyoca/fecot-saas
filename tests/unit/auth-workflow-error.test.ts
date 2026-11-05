import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node native TypeScript imports.
import { authenticationWorkflowFailure } from "../../lib/auth/workflow-error.ts"
// @ts-expect-error Node native TypeScript imports.
import { UsersDataError } from "../../lib/users/errors.ts"
// @ts-expect-error Node native TypeScript imports.
import { PasswordPolicyError } from "../../lib/auth/password-policy.ts"
test("activation and password changes distinguish source failure from refused credentials",()=>{
 assert.equal(authenticationWorkflowFailure(new UsersDataError("SOURCE_UNAVAILABLE","internal private details"),"Refus").status,503)
 assert.equal(authenticationWorkflowFailure(new Error("private details"),"Refus").message,"Refus")
 assert.equal(authenticationWorkflowFailure(new PasswordPolicyError("TOO_SHORT","12 caractères minimum"),"Refus").message,"12 caractères minimum")
})
