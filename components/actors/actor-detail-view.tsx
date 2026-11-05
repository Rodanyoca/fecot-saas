"use client"

import {useId,useRef,type ReactNode} from "react"
import {Camera,Contact,Fingerprint,Flag,Info,User,UserCog} from "lucide-react"
import {Avatar,AvatarImage,AvatarFallback} from "@/components/ui/avatar"
import {Button} from "@/components/ui/button"
import {Card,CardContent} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {DetailCard} from "@/components/dashboard/detail-card"
import type {ActorRecord} from "@/lib/actors/model"

export function ActorDetailView({actor,section,onSectionChange,canWrite,uploading,revision,onUpload,children}:{actor:ActorRecord;section:string;onSectionChange:(value:string)=>void;canWrite:boolean;uploading:boolean;revision:number;onUpload:(type:"avatar",file:File|undefined)=>void;children:ReactNode}){
 const input=useRef<HTMLInputElement>(null),id=useId(),tabs=[["identity","Général"],["affiliations",actor.kind==="arbitres"?"Affectations":"Affiliations"],["licences",actor.kind==="athletes"?"Licence":"Licences"]]
 const value=(key:string)=>actor.values[key]||"—"
 const other=actor.kind==="autres-acteurs"
 const identityFields=[...(other?[{label:"Identifiant",value:actor.id}]:[]),{label:"Nom complet",value:value("nom_complet")},{label:"Sexe",value:actor.sexe},{label:"Date de naissance",value:value("date_naissance")},...(Object.hasOwn(actor.values,"lieu_naissance")?[{label:"Lieu de naissance",value:value("lieu_naissance")}]:[]),{label:"Nationalité",value:value("nationalite")},...(actor.kind==="medecins"?[{label:"Spécialité",value:actor.extraLabel||"—"}]:[]),...(other?[{label:"Type",value:actor.extraLabel||"—"},{label:"Entité",value:value("entite")},{label:"Statut",value:value("statut")}]:[])]
 const identifiers=[{label:actor.kind==="athletes"?"ID Athlète":actor.kind==="medecins"?"ID médecin":actor.kind==="officiels"?"ID officiel":"ID",value:actor.id},{label:"ID national",value:value("id_national")},{label:"ID WT",value:value("id_wt")},...(actor.kind==="arbitres"?[{label:"Grade",value:actor.extraLabel||"—"}]:[]),{label:"Statut",value:value("statut")}]
 const cards={identity:<DetailCard title="Identité" icon={actor.kind==="coachs"?UserCog:actor.kind==="arbitres"||actor.kind==="officiels"||actor.kind==="medecins"?Flag:User} fields={identityFields}/>,contact:<DetailCard title={other?"Coordonnées":"Contact"} icon={Contact} fields={[{label:"Téléphone",value:value("telephone")},{label:other?"Courriel":"Email",value:value("email")},{label:"Adresse",value:value("adresse")}]}/>,identifiers:<DetailCard title="Identifiants" icon={Fingerprint} fields={identifiers}/>,observations:<DetailCard title="Observations" icon={Info} fields={[{label:"Remarques",value:actor.values.observations||"Aucune remarque enregistrée"}]}/>}
 const order:(keyof typeof cards)[]=other?["identity","contact","observations"]:actor.kind==="athletes"?["identity","contact","identifiers","observations"]:["identity","identifiers","contact","observations"]
 const initials=actor.values.nom_complet.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"AT"
 return <>
  <Card><CardContent className="p-6"><div className="flex flex-wrap items-start justify-between gap-4">
   <div className="flex min-w-0 items-center gap-4"><Avatar className="size-20 shrink-0"><AvatarImage key={revision} src={actor.avatarUrl||undefined} alt={actor.values.nom_complet}/><AvatarFallback className="text-lg">{initials}</AvatarFallback></Avatar><h2 className="min-w-0 break-words text-2xl font-bold">{actor.values.nom_complet}</h2></div>
   {canWrite&&<div className="text-right"><Button type="button" variant="outline" size="sm" disabled={uploading} onClick={()=>input.current?.click()}><Camera className="size-4"/>Ajouter la photo</Button><Input ref={input} aria-label="Photo de l’acteur" className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={event=>{onUpload("avatar",event.target.files?.[0]);event.target.value=""}}/></div>}
  </div></CardContent></Card>
  <div className="space-y-4">
   <div role="tablist" aria-label="Sections de la fiche" className="grid h-auto w-full grid-cols-3 rounded-lg bg-muted p-1" onKeyDown={event=>{
    const current=tabs.findIndex(([key])=>key===section),next=event.key==="ArrowRight"?(current+1)%3:event.key==="ArrowLeft"?(current+2)%3:event.key==="Home"?0:event.key==="End"?2:-1
    if(next<0)return;event.preventDefault();onSectionChange(tabs[next][0]);document.getElementById(`${id}-${tabs[next][0]}`)?.focus()
   }}>{tabs.map(([key,label])=><Button key={key} id={`${id}-${key}`} type="button" role="tab" aria-selected={section===key} aria-controls={`${id}-panel`} tabIndex={section===key?0:-1} variant="ghost" className={`w-full ${section===key?"bg-background text-foreground shadow-sm":"text-muted-foreground"}`} onClick={()=>onSectionChange(key)}>{label}</Button>)}</div>
   <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${section}`}>
   {section==="identity"?<div className="grid gap-6 md:grid-cols-2">
    {order.map(key=><div key={key} className="min-w-0 [&>div]:h-full">{cards[key]}</div>)}
   </div>:children}
   </div>
  </div>
 </>
}
