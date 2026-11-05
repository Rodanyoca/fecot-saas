"use client"
import {useEffect,useRef,useState} from "react"
import {ArrowLeft,Eye} from "lucide-react"
import {toast} from "sonner"
import {Header} from "@/components/dashboard/header"
import {DataTable,type Column} from "@/components/dashboard/data-table"
import {StatusBadge} from "@/components/dashboard/status-badge"
import {Avatar,AvatarImage,AvatarFallback} from "@/components/ui/avatar"
import {Button} from "@/components/ui/button"
import {Card,CardHeader,CardTitle,CardContent} from "@/components/ui/card"
import {ActorEditor} from "./actor-editor"
import {ActorDetailView} from "./actor-detail-view"
import {AffiliationsPanel} from "@/components/affiliations/affiliations-panel"
import {isAffiliationKind} from "@/lib/affiliations/model"
import {LicenceHistory} from "@/components/licences/licence-history"
import {actorAge,actorSex,actorSingular} from "@/lib/actors/presentation"
import {relationTitles,relationColumnLabel} from "@/lib/actors/relation-labels"
import {actorConfig,type ActorKind,type ActorRecord,type ActorEditorData} from "@/lib/actors/model"
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase()||"AC"
const listKeys=["nom_complet","id_national","id_wt","id_sexe","statut","date_naissance","nationalite","id_niveau","id_grade_arbitre","id_specialite","id_type_autre_acteur","telephone"]
const asList=(actor:ActorRecord):ActorRecord=>({...actor,passportUrl:"",values:Object.fromEntries(listKeys.filter(k=>k in actor.values&&(k!=="telephone"||actor.kind==="autres-acteurs")).map(k=>[k,actor.values[k]]))})

export function ActorsClient({kind,canWrite}:{kind:ActorKind;canWrite:boolean}){
 const [actors,setActors]=useState<ActorRecord[]>([]),[selected,setSelected]=useState<ActorRecord|null>(null),[error,setError]=useState(""),[warning,setWarning]=useState(false),[loading,setLoading]=useState(true),[detailLoading,setDetailLoading]=useState(false)
 const [editorData,setEditorData]=useState<ActorEditorData|null>(null)
 const [detailTarget,setDetailTarget]=useState<ActorRecord|null>(null),[detailError,setDetailError]=useState("")
 const detailRequest=useRef<AbortController|null>(null)
 useEffect(()=>{const controller=new AbortController();setLoading(true);setEditorData(null);setError("");setSelected(null);setDetailTarget(null);setDetailError("");setDetailLoading(false);detailRequest.current?.abort()
  void fetch(`/api/actors/${kind}`,{cache:"no-store",signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error?.message||"Chargement impossible.");if(!controller.signal.aborted){setActors(data.actors);setEditorData(data.editorData??null);setWarning(!data.referencesAvailable)}}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>{controller.abort();detailRequest.current?.abort()}
 },[kind])
 const closeDetail=()=>{detailRequest.current?.abort();setDetailLoading(false);setDetailTarget(null);setDetailError("");setSelected(null)}
 const open=async(actor:ActorRecord)=>{detailRequest.current?.abort();const controller=new AbortController();detailRequest.current=controller;setDetailTarget(actor);setSelected(null);setDetailLoading(true);setDetailError("")
  try{const r=await fetch(`/api/actors/${kind}/${encodeURIComponent(actor.id)}`,{cache:"no-store",signal:controller.signal}),data=await r.json();if(!r.ok)throw Error(data.error?.message||"Fiche indisponible.");if(!controller.signal.aborted){setSelected(data.actor)}}catch(e){if(!controller.signal.aborted)setDetailError(e instanceof Error?e.message:"Fiche indisponible.")}finally{if(!controller.signal.aborted)setDetailLoading(false)}
 }
 const saved=(actor:ActorRecord)=>{setActors(old=>old.some(a=>a.id===actor.id)?old.map(a=>a.id===actor.id?asList(actor):a):[asList(actor),...old]);setSelected(old=>old?.id===actor.id?actor:old)}
 if(detailLoading)return <><Header title="Chargement..."/><main className="min-w-0 space-y-4 p-4 sm:p-6"><p role="status" className="text-muted-foreground">Chargement de la fiche…</p><Button variant="outline" onClick={closeDetail}><ArrowLeft className="size-4"/>Retour à la liste</Button></main></>
 if(detailError&&detailTarget)return <><Header title="Fiche indisponible"/><main className="min-w-0 space-y-4 p-4 sm:p-6"><p role="alert" className="text-destructive">{detailError}</p><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={closeDetail}><ArrowLeft className="size-4"/>Retour à la liste</Button><Button onClick={()=>void open(detailTarget)}>Réessayer</Button></div></main></>
 const photo=(actor:ActorRecord)=> <Avatar className="size-10"><AvatarImage loading="lazy" src={actor.avatarUrl||undefined} alt={`Photo de ${actor.values.nom_complet}`}/><AvatarFallback>{initials(actor.values.nom_complet)}</AvatarFallback></Avatar>
 const rows=actors.map(a=>({...a,...a.values,nom_complet:a.values.nom_complet,sexe:a.sexe,extraLabel:a.extraLabel,statut:a.values.statut}))
 type ListRow=typeof rows[number]
 const idColumn:Column<ListRow>={key:"id",header:"Licence",className:"whitespace-normal break-all font-mono text-sm"}
 const avatarColumn:Column<ListRow>={key:"avatarUrl",header:"Avatar",className:"text-center",render:photo}
 const nameColumn:Column<ListRow>={key:"nom_complet",header:"Nom complet",className:"whitespace-normal break-words font-medium",...(kind==="arbitres"?{render:(row:ListRow)=><div className="flex items-center gap-3">{photo(row)}<span className="min-w-0 break-words">{row.nom_complet}</span></div>}:{})}
 const sexColumn:Column<ListRow>={key:"sexe",header:kind==="autres-acteurs"?"Sexe":"Sexe / âge",className:"text-center",render:row=>{const age=actorAge(row.values.date_naissance);return kind==="autres-acteurs"?row.sexe:<div className="flex flex-col items-center leading-tight"><span className="text-sm font-semibold">{actorSex(row.sexe)}</span><span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{age===null?"—":`${age} ans`}</span></div>}}
 const nationalColumn:Column<ListRow>={key:"id_national",header:"ID national",className:"whitespace-normal break-all font-mono text-sm"}
 const wtColumn:Column<ListRow>={key:"id_wt",header:"ID WT",className:"whitespace-normal break-all font-mono text-sm"}
 const statusColumn:Column<ListRow>={key:"statut",header:"Statut",render:row=><StatusBadge status={row.statut}/>}
 const extraColumn:Column<ListRow>={key:"extraLabel",header:kind==="arbitres"?"Grade":kind==="medecins"?"Spécialité":kind==="autres-acteurs"?"Type":"Niveau",className:"whitespace-normal break-words"}
 const columns:Column<ListRow>[]=kind==="autres-acteurs"?[idColumn,nameColumn,extraColumn,sexColumn,{key:"telephone",header:"Téléphone"},statusColumn]:
  kind==="arbitres"?[idColumn,nameColumn,sexColumn,extraColumn,nationalColumn,wtColumn,statusColumn]:
  kind==="coachs"?[idColumn,avatarColumn,nameColumn,extraColumn,sexColumn,nationalColumn,wtColumn,statusColumn]:
  kind==="medecins"?[idColumn,avatarColumn,nameColumn,extraColumn,sexColumn,nationalColumn,wtColumn,statusColumn]:
  [idColumn,avatarColumn,nameColumn,sexColumn,nationalColumn,wtColumn,statusColumn]
 if(selected)return <><Header title={`Fiche ${actorSingular[kind]} : ${selected.values.nom_complet}`} subtitle={`${actorConfig[kind].title} · ${selected.id}`}/><main className="min-w-0 space-y-6 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={()=>setSelected(null)}><ArrowLeft className="size-4"/>Retour à la liste</Button><ActorEditor kind={kind} editorData={editorData} actor={selected} canWrite={canWrite} onSaved={saved}/></div><ActorDetail key={selected.id} actor={selected} canWrite={canWrite} onSaved={saved}/></main></>
 return <><Header title={actorConfig[kind].title} subtitle="Acteurs FECOT"/><main className="min-w-0 space-y-5 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-end gap-3"><ActorEditor kind={kind} editorData={editorData} canWrite={canWrite&&!loading} onSaved={saved}/></div>
 {error&&<p role="alert" className="rounded-xl border border-destructive/40 p-4 text-destructive">{error}</p>}{warning&&<p role="status" className="text-sm text-muted-foreground">Référentiels partiellement indisponibles ; les identifiants disponibles restent affichés.</p>}
 {loading?<p role="status">Chargement des acteurs…</p>:<>{detailLoading&&<p role="status">Chargement de la fiche…</p>}<DataTable tableClassName="font-sans [&_th]:font-sans [&_th_button]:uppercase" data={rows} columns={columns} idKey="id" searchPlaceholder="Rechercher un acteur..." filters={[{key:"sexe",label:"Sexe",options:[...new Set(rows.map(r=>r.sexe).filter(Boolean))].map(value=>({value,label:value}))},{key:"statut",label:"Statut",options:[{value:"ACTIF",label:"Actif"},{value:"INACTIF",label:"Inactif"}]}]} renderActions={actor=><Button variant="ghost" size="icon" aria-label={`Voir ${actor.nom_complet}`} onClick={()=>void open(actor)}><Eye className="size-4"/></Button>} renderMobileCard={actor=><article className="rounded-xl border bg-card p-4"><div className="flex items-center gap-3">{photo(actor)}<div className="min-w-0"><p className="break-words font-semibold">{actor.nom_complet}</p><p className="break-all font-mono text-xs text-muted-foreground">{actor.id}</p></div></div><div className="mt-3 flex justify-between gap-3">{kind==="athletes"?sexColumn.render?.(actor):<span>{actor.sexe}{kind!=="autres-acteurs"&&actorAge(actor.values.date_naissance)!==null?` · ${actorAge(actor.values.date_naissance)} ans`:""}</span>}<StatusBadge status={actor.statut}/></div>{actor.extraLabel&&<p className="mt-2 text-sm">{actor.extraLabel}</p>}{kind!=="athletes"&&<div className="mt-3 grid grid-cols-2 gap-3 text-sm">{kind==="autres-acteurs"?<div><p className="text-muted-foreground">Téléphone</p><p className="break-all">{actor.values.telephone||"—"}</p></div>:<><div><p className="text-muted-foreground">{nationalColumn.header}</p><p className="break-all">{actor.values.id_national||"—"}</p></div><div><p className="text-muted-foreground">{wtColumn.header}</p><p className="break-all">{actor.values.id_wt||"—"}</p></div></>}</div>}<Button variant="outline" className="mt-3 w-full" onClick={()=>void open(actor)}>Voir {actor.nom_complet}</Button></article>}/></>}
 </main></>
}

function ActorDetail({actor,canWrite,onSaved}:{actor:ActorRecord;canWrite:boolean;onSaved:(actor:ActorRecord)=>void}){
 const [section,setSection]=useState("identity"),[retry,setRetry]=useState(0),[relations,setRelations]=useState<{sheet:string;headers:string[];rows:Record<string,string>[]}[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(false),[uploading,setUploading]=useState(false),[uploadUncertain,setUploadUncertain]=useState(false),[revision,setRevision]=useState(0)
 useEffect(()=>{setRelations([]);setError("");if(section==="identity"||section==="licences"||(section==="affiliations"&&isAffiliationKind(actor.kind)))return;const controller=new AbortController();setLoading(true)
  void fetch(`/api/actors/${actor.kind}/${encodeURIComponent(actor.id)}?section=${section}`,{cache:"no-store",signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error?.message||"Relations indisponibles.");if(!controller.signal.aborted)setRelations(data.sections)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[actor.id,actor.kind,section,retry])
 const upload=async(type:"avatar"|"passport",file:File|undefined)=>{if(!file||uploading||uploadUncertain)return;setUploading(true)
  try{const body=new FormData();body.append("file",file);const r=await fetch(`/api/actors/${actor.kind}/${encodeURIComponent(actor.id)}/media/${type}`,{method:"PUT",body}),data=await r.json();if(!r.ok){if(data.error?.uncertain)setUploadUncertain(true);throw Error(data.error?.message||"Envoi impossible.")};onSaved(data.actor);setRevision(v=>v+1);toast.success("Média enregistré et confirmé.")}catch(e){setUploadUncertain(true);toast.error(e instanceof Error?e.message:"Envoi impossible.")}finally{setUploading(false)}
 }
 return <ActorDetailView actor={actor} section={section} onSectionChange={setSection} canWrite={canWrite} uploading={uploading||uploadUncertain} revision={revision} onUpload={(type,file)=>void upload(type,file)}>{section==="licences"?<LicenceHistory key={`${actor.kind}:${actor.id}`} kind={actor.kind} actorId={actor.id}/>:section==="affiliations"&&isAffiliationKind(actor.kind)?<AffiliationsPanel key={`${actor.kind}:${actor.id}`} kind={actor.kind} actorId={actor.id} canWrite={canWrite}/>:<Card><CardHeader><CardTitle>{section==="affiliations"?(actor.kind==="arbitres"?"Affectations et grades":"Affiliations"):"Historique des licences"}</CardTitle></CardHeader><CardContent className="min-w-0 space-y-4">{loading?<p role="status">Chargement des relations…</p>:error?<div role="alert"><p className="text-destructive">{error}</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>Réessayer</Button></div>:relations.map(group=><div key={group.sheet} className="space-y-3"><h3 className="text-sm font-semibold">{relationTitles[group.sheet]||"Relations"}</h3><DataTable data={group.rows} columns={group.headers.map(key=>({key,header:relationColumnLabel(key)}))} idKey={group.headers[0]} searchPlaceholder="Rechercher une relation..."/></div>)}</CardContent></Card>}</ActorDetailView>
}
