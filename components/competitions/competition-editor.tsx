"use client"
import {useEffect,useRef,useState} from "react"
import {toast} from "sonner"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea"
import {SearchSelect} from "@/components/ui/search-select"
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select"
import {Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from "@/components/ui/sheet"
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from "@/components/ui/dialog"
import {CompactDateInput} from "@/components/ui/compact-date-input"
import {compactDateFromSheet} from "@/lib/compact-date"
import {apiFetch,apiErrorMessage,readApiJson} from "@/lib/api/client"
import {fields,defaults} from "@/lib/competitions/fields"
import {titles,type Dataset,type Entity,type Option,type Section,type View} from "@/lib/competitions/model"
export type CompetitionEditorTarget={entity:Entity;item?:View;view?:boolean}
export function CompetitionEditor({target,data,competitionId,section,onClose,onSaved,onUncertain,inline=false}:{target:CompetitionEditorTarget;data:Dataset;competitionId?:string;section:Section;onClose:()=>void;onSaved:()=>void;onUncertain:()=>void;inline?:boolean}){
 const {entity,item}=target,readOnly=!!target.view||!!item?.readOnly
 const descriptors=fields[entity].length?fields[entity].filter(f=>!f.optionalColumn||data.capabilities.eventFormatColumn):Object.keys(item?.values||{}).map(key=>({key,label:key.replaceAll("_"," ")})) as typeof fields[Entity]
 const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(descriptors.map(f=>[f.key,f.type==="date"?compactDateFromSheet(item?.values[f.key]||""):item?.values[f.key]||defaults[entity]?.[f.key]||(f.key==="statut"?"ACTIF":f.key==="id_saison"?data.defaultSeasonId:"")]))),[references,setReferences]=useState(data.references),[optionError,setOptionError]=useState(""),[optionLoading,setOptionLoading]=useState(false),[optionRevision,setOptionRevision]=useState(0),[error,setError]=useState(""),[fieldErrors,setFieldErrors]=useState<Record<string,string>>({}),[saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(false),[review,setReview]=useState(false),guard=useRef(false),alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 const typeId=values.id_type_acteur||""
 useEffect(()=>{
  if(readOnly||!competitionId||!["engagement","intervenant","distinction"].includes(entity))return
  const controller=new AbortController();setOptionLoading(true);setOptionError("")
  void apiFetch(`/api/competitions/${encodeURIComponent(competitionId)}/${section}?options=1${typeId?`&typeId=${encodeURIComponent(typeId)}`:""}`,{signal:controller.signal}).then(async response=>{const json=await readApiJson(response);if(!response.ok)throw Error(apiErrorMessage(response,json,"Options indisponibles."));if(!controller.signal.aborted)setReferences(json.references)}).catch(e=>{if(!controller.signal.aborted){setOptionError(e instanceof Error?e.message:"Options indisponibles.");setReferences(old=>({...old,actors:[],athletes:[],clubs:[]}))}}).finally(()=>{if(!controller.signal.aborted)setOptionLoading(false)})
  return()=>controller.abort()
 },[competitionId,section,entity,readOnly,typeId,optionRevision])
 const change=(key:string,value:string)=>setValues(old=>({...old,[key]:value,...(key==="id_type_acteur"?{id_acteur:""}:key==="id_epreuve_competition"?{id_phase_competition:"",id_groupe:"",id_unite_competition:"",id_unite_a:"",id_unite_b:""}:key==="id_phase_competition"?{id_groupe:"",id_unite_competition:"",id_unite_a:"",id_unite_b:""}:key==="id_club"?{id_athlete:""}:{})}))
 const optionsFor=(key:string,name:string):Option[]=>{
  let result=references[name]||[]
  const eventId=values.id_epreuve_competition||references.phases?.find(p=>p.id===values.id_phase_competition)?.eventId
  if(name==="phases"&&key!=="id_phase_source"&&eventId)result=result.filter(o=>o.eventId===eventId)
  if(name==="groupes")result=result.filter(o=>o.phaseId===values.id_phase_competition)
  if(name==="unites"&&eventId)result=result.filter(o=>o.eventId===eventId)
  if(name==="athletes")result=result.filter(o=>{try{return (JSON.parse(o.clubs||"[]")as string[]).includes(values.id_club)}catch{return false}})
  const value=values[key];if(value&&!result.some(o=>o.id===value))result=[{id:value,label:item?.labels[key]||value},...result]
  return result
 }
 const missing=descriptors.filter(f=>f.required&&f.options&&!optionsFor(f.key,f.options).length)
 const submit=async(event:React.FormEvent)=>{
  event.preventDefault();if(readOnly||guard.current||uncertain||optionLoading||optionError||missing.length)return
  guard.current=true;setSaving(true);setError("");setFieldErrors({});let responseReceived=false
  try{
   const parentId=competitionId||(entity==="competition"?item?.id:undefined),base=`/api/competitions${parentId?`/${encodeURIComponent(parentId)}${section!=="general"?`/${section}`:""}`:""}`,query=item&&section!=="general"?`?recordId=${encodeURIComponent(item.id)}`:""
   const response=await apiFetch(base+query,{method:item?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entity,values,version:item?.version,reviewRankings:review})}),json=await readApiJson(response)
   responseReceived=true
   if(!response.ok){if(json.error?.uncertain||json.error?.code==="WRITE_UNCERTAIN"){setUncertain(true);onUncertain()}setFieldErrors(json.error?.fields||{});throw Error(apiErrorMessage(response,json,"Enregistrement impossible."))}
   if(alive.current){toast.success("Enregistrement confirmé.");onSaved();onClose()}
  }catch(e){if(alive.current){setError(e instanceof Error?e.message:"Réponse non reçue.");if(!responseReceived){setUncertain(true);onUncertain()}}}finally{guard.current=false;if(alive.current)setSaving(false)}
 }
 const dialog=entity==="epreuve"||entity==="competition"&&!item,Root=dialog?Dialog:Sheet,Content=dialog?DialogContent:SheetContent,Heading=dialog?DialogHeader:SheetHeader,Title=dialog?DialogTitle:SheetTitle,Description=dialog?DialogDescription:SheetDescription,Footer=dialog?DialogFooter:SheetFooter
 const order=["nom_competition","numero_edition","id_type_competition","id_discipline","id_saison","statut","date_debut","date_fin","pays","lieu","observations"],shown=descriptors.filter(f=>!inline||!["statut","observations"].includes(f.key));if(entity==="competition")shown.sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key))
 const form=<form className={inline?"space-y-4":dialog?"space-y-4":"space-y-5 px-4 pb-6"} onSubmit={submit}>
 {item?.anomaly&&<p role="alert" className="text-sm text-amber-600">{item.anomaly}</p>}
 {entity==="engagement"&&<p className="text-sm text-muted-foreground">Engagement individuel d’un athlète affilié au club à la date de début. L’affectation initiale est enregistrée avec son unité sportive.</p>}
 {["resultat","resultatPrestation","classement"].includes(entity)&&<p className="text-sm text-muted-foreground">Saisissez la décision officielle. Aucun calcul automatique de qualification ou de classement.</p>}
 {optionLoading&&<p role="status" className="text-sm">Chargement des options…</p>}{optionError&&<div role="alert"><p className="text-destructive">{optionError}</p><Button type="button" variant="outline" onClick={()=>setOptionRevision(v=>v+1)}>Réessayer les options</Button></div>}
 <div className={inline&&entity==="groupe"?"grid gap-3":"grid gap-4 sm:grid-cols-2"}>{shown.map(f=>{const id=`competition-${entity}-${f.key}`,value=values[f.key]||"",disabled=saving||readOnly||uncertain||!!(item&&f.locked),opts=f.options?optionsFor(f.key,f.options):[];return <div className={`space-y-2 ${(["nom_competition","nom_epreuve","numero_edition","pays","lieu","observations"].includes(f.key)||inline&&entity==="phase"&&f.key==="id_epreuve_competition")?"sm:col-span-2":""}`} key={f.key}><Label htmlFor={id}>{entity==="competition"?({nom_competition:"Nom",id_type_competition:"Type",date_debut:"Date de début",date_fin:"Date de fin"}as Record<string,string>)[f.key]||f.label:f.label}{f.required?" *":""}</Label>{f.type==="search"?<SearchSelect id={id} value={value} options={opts} onValueChange={v=>change(f.key,v)} disabled={disabled||optionLoading} invalid={!!fieldErrors[f.key]} placeholder="Saisissez au moins 2 caractères…"/>:f.type==="select"?<Select value={value||"__none__"} onValueChange={v=>change(f.key,v==="__none__"?"":v)} disabled={disabled}><SelectTrigger id={id} aria-invalid={!!fieldErrors[f.key]}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__none__">Sélectionner</SelectItem>{opts.map(o=><SelectItem value={o.id} key={o.id}>{o.label}</SelectItem>)}</SelectContent></Select>:f.type==="date"?<CompactDateInput id={id} value={value} onValueChange={v=>change(f.key,v)} required={f.required} optional={!f.required} disabled={disabled}/>:f.type==="textarea"?<Textarea id={id} value={value} onChange={e=>change(f.key,e.target.value)} disabled={disabled} maxLength={5000}/>:<Input id={id} type={f.type==="time"?"time":"text"} inputMode={f.type==="number"?"decimal":undefined} value={value} onChange={e=>change(f.key,e.target.value)} required={f.required} disabled={disabled} maxLength={300}/>} {fieldErrors[f.key]&&<p className="text-sm text-destructive">{fieldErrors[f.key]}</p>}</div>})}</div>
 {missing.length>0&&!readOnly&&<p role="alert" className="text-sm text-amber-600">Référentiel requis indisponible : {missing.map(f=>f.label).join(", ")}. Aucun identifiant de remplacement ne sera créé.</p>}
 {item&&!readOnly&&["resultat","resultatPrestation"].includes(entity)&&<Label className="flex items-start gap-2"><input type="checkbox" checked={review} onChange={e=>setReview(e.target.checked)} disabled={saving||uncertain}/><span>Autoriser la remise en révision des classements dépendants lors de cette correction.</span></Label>}
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{uncertain&&<p role="alert">Confirmation indisponible. Fermez et actualisez les données avant toute nouvelle tentative.</p>}
 <Footer className="px-0">{!inline&&<Button type="button" variant="outline" disabled={saving} onClick={onClose}>{readOnly?"Fermer":"Annuler"}</Button>}{!readOnly&&<Button type="submit" disabled={saving||uncertain||optionLoading||!!optionError||!!missing.length}>{saving?"Enregistrement…":inline?"Ajouter":entity==="competition"&&!item?"Créer":"Enregistrer"}</Button>}</Footer>
 </form>
 if(inline)return form
 return <Root open onOpenChange={open=>{if(!open&&!saving)onClose()}}><Content className={dialog?"max-h-[90vh] overflow-y-auto sm:max-w-2xl":"w-full overflow-y-auto sm:max-w-2xl"}><Heading><Title>{entity==="competition"?readOnly?"Consulter la compétition":item?"Modifier la compétition":"Créer une compétition":`${readOnly?"Consulter":item?"Modifier":"Créer"} — ${titles[entity]}`}</Title><Description>{item?item.id:"Identifiant attribué et vérifié par le serveur."}</Description></Heading>{form}</Content></Root>
}
