"use client"
import {useEffect,useRef,useState} from "react"
import {Pencil,Plus} from "lucide-react"
import {toast} from "sonner"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea"
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select"
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetFooter} from "@/components/ui/sheet"
import {CompactDateInput} from "@/components/ui/compact-date-input"
import {compactDateFromSheet} from "@/lib/compact-date"
import {actorConfig,type ActorKind,type ActorRecord,type ActorField,type ActorReferences,type ActorEditorData} from "@/lib/actors/model"

export function ActorEditor({kind,actor,canWrite,onSaved,editorData}:{kind:ActorKind;actor?:ActorRecord;canWrite:boolean;onSaved:(actor:ActorRecord)=>void;editorData?:ActorEditorData|null}){
 const [open,setOpen]=useState(false),[fields,setFields]=useState<ActorField[]>([]),[refs,setRefs]=useState<ActorReferences>({}),[values,setValues]=useState<Record<string,string>>({}),[errors,setErrors]=useState<Record<string,string>>({}),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(false)
 const request=useRef<AbortController|null>(null),submitting=useRef(false)
 useEffect(()=>()=>request.current?.abort(),[])
 if(!canWrite)return null
 const close=()=>{if(saving)return;request.current?.abort();setOpen(false)}
 const start=async()=>{
  if(editorData?.kind===kind){
   setErrors({});setUncertain(false);setFields(editorData.fields);setRefs(editorData.references)
   setValues(Object.fromEntries(editorData.fields.map(f=>{const raw=actor?.values[f.key]||(f.key==="statut"?"ACTIF":"");return [f.key,f.type==="date"?(compactDateFromSheet(raw)||raw):raw]})))
   setOpen(true);return
  }
  request.current?.abort();const controller=new AbortController();request.current=controller
  setLoading(true);setErrors({});setUncertain(false)
  try{const response=await fetch(`/api/actors/${kind}?references=1`,{cache:"no-store",signal:controller.signal}),data=await response.json();if(!response.ok)throw Error(data.error?.message||"Référentiels indisponibles.")
   if(controller.signal.aborted)return
   setFields(data.fields);setRefs(data.references)
   setValues(Object.fromEntries((data.fields as ActorField[]).map(f=>{const raw=actor?.values[f.key]|| (f.key==="statut"?"ACTIF":"");return [f.key,f.type==="date"?(compactDateFromSheet(raw)||raw):raw]})))
   setOpen(true)
  }catch(error){if(!controller.signal.aborted)setErrors({_form:error instanceof Error?error.message:"Chargement impossible."})}finally{if(!controller.signal.aborted)setLoading(false)}
 }
 const submit=async(event:React.FormEvent)=>{
  event.preventDefault();if(submitting.current||uncertain)return;submitting.current=true;setSaving(true);setErrors({})
  try{const response=await fetch(`/api/actors/${kind}${actor?`/${encodeURIComponent(actor.id)}`:""}`,{method:actor?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)}),data=await response.json()
   if(!response.ok){setErrors({...data.error?.fields,_form:data.error?.message||"Enregistrement impossible."});if(data.error?.uncertain)setUncertain(true);return}
   onSaved(data.actor);setOpen(false);toast.success("Fiche enregistrée et confirmée.")
  }catch{setUncertain(true);setErrors({_form:"Réponse non reçue. Rechargez la liste avant de réessayer pour éviter une création en double."})}finally{submitting.current=false;setSaving(false)}
 }
 const optionList=(f:ActorField)=>f.key==="statut"?[{id:"ACTIF",label:"Actif"},{id:"INACTIF",label:"Inactif"}]:f.key==="id_sexe"?refs.SEXES||[]:refs[actorConfig[kind].reference||""]||[]
 return <><Button type="button" onClick={start} disabled={loading} aria-busy={loading} className="bg-brand-gold text-[#071827] hover:bg-brand-gold/90">{actor?<Pencil className="size-4"/>:<Plus className="size-4"/>}{loading?"Ouverture…":actor?"Modifier":"Ajouter"}</Button>{!open&&errors._form&&<p role="alert" className="text-sm text-destructive">{errors._form}</p>}<Sheet open={open} onOpenChange={value=>{if(!value)close()}}><SheetContent className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader><SheetTitle>{actor?"Modifier la fiche":"Créer une fiche"} — {actorConfig[kind].title}</SheetTitle><SheetDescription>Identité et informations stables FECOT. Identifiant attribué côté serveur, non modifiable.</SheetDescription></SheetHeader><form onSubmit={submit} className="space-y-6 px-4 pb-8">
 <p className="rounded-lg bg-muted/40 p-3 text-sm">Identifiant : {actor?.id||"Attribué à la création"}</p>
 {["Identification","Coordonnées","Passeport","Complément"].map(section=>fields.some(f=>f.section===section)&&<fieldset key={section} className="grid gap-4 sm:grid-cols-2"><legend className="mb-3 text-sm font-semibold uppercase tracking-wide">{section}</legend>{fields.filter(f=>f.section===section).map(f=>{
  const id=`actor-${f.key}`,value=values[f.key]||"",options=optionList(f),historical=f.type==="reference"&&value&&!options.some(o=>o.id===value)
  return <div key={f.key} className={f.type==="textarea"?"space-y-2 sm:col-span-2":"space-y-2"}><Label htmlFor={id}>{f.label}{f.required?" *":""}</Label>{f.type==="reference"?<><Select value={value||(!f.required?"__empty":"")} onValueChange={v=>setValues(old=>({...old,[f.key]:v==="__empty"?"":v}))} disabled={saving||(!options.length&&!value)} required={f.required}><SelectTrigger id={id} aria-invalid={Boolean(errors[f.key])}><SelectValue placeholder={options.length?"Sélectionner":"Référentiel vide"}/></SelectTrigger><SelectContent>{!f.required&&<SelectItem value="__empty">Non renseigné</SelectItem>}{historical&&<SelectItem value={value}>Valeur historique ({value})</SelectItem>}{options.map(o=><SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent></Select>{!options.length&&<p className="text-xs text-muted-foreground">Aucune valeur configurée ; aucun choix inventé.</p>}</>:f.type==="date"?<CompactDateInput id={id} value={value} optional disabled={saving} onValueChange={v=>setValues(old=>({...old,[f.key]:v}))}/>:f.type==="textarea"?<Textarea id={id} value={value} disabled={saving} onChange={e=>setValues(old=>({...old,[f.key]:e.target.value}))}/>:<Input id={id} type={f.type==="email"?"email":"text"} required={f.required} value={value} disabled={saving} aria-invalid={Boolean(errors[f.key])} onChange={e=>setValues(old=>({...old,[f.key]:e.target.value}))}/>} {errors[f.key]&&<p className="text-sm text-destructive">{errors[f.key]}</p>}</div>
 })}</fieldset>)}
 {errors._form&&<p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{errors._form}</p>}<SheetFooter><Button type="button" variant="outline" disabled={saving} onClick={close}>Fermer</Button><Button type="submit" disabled={loading||saving||uncertain||!fields.length}>{saving?"Enregistrement…":"Enregistrer"}</Button></SheetFooter>
 </form></SheetContent></Sheet></>
}
