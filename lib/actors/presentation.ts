// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {formatDateFromSheet} from "../compact-date.ts"
import type {ActorKind} from "./model"

export const actorSingular:Record<ActorKind,string>={athletes:"Athlète",coachs:"Entraîneur",arbitres:"Arbitre",officiels:"Officiel",medecins:"Médecin","autres-acteurs":"Acteur"}
export function actorAge(value:string|undefined,today=new Date()):number|null{
 const raw=value?.trim()||""
 if(!/^(?:\d{1,8}|\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{1,2}-\d{1,2}(?:[T ].*)?)$/.test(raw))return null
 try{const [year,month,day]=formatDateFromSheet(raw).split("-").map(Number)
  const age=today.getFullYear()-year-(today.getMonth()+1<month||today.getMonth()+1===month&&today.getDate()<day?1:0)
  return age>=0?age:null
 }catch{return null}
}
export function actorSex(value:string){const normalized=value.trim().toUpperCase();return normalized==="MASCULIN"?"M":normalized==="FEMININ"?"F":value||"—"}
