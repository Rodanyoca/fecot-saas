"use client"
import { useEffect, useRef, useState } from "react"
import { Eye, Pencil, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { Column } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CompactDateInput } from "@/components/ui/compact-date-input"
import { SearchSelect } from "@/components/ui/search-select"
import { compactDateFromSheet, formatDateForDisplay } from "@/lib/compact-date"
import { affiliationConfig, type AffiliationItem, type AffiliationKind, type AffiliationOption, type AffiliationOptions } from "@/lib/affiliations/model"
import { apiFetch, readApiJson, apiErrorMessage } from "@/lib/api/client"

export function AffiliationsPanel({ kind, actorId, canWrite }: { kind: AffiliationKind; actorId: string; canWrite: boolean }) {
 const [items, setItems] = useState<AffiliationItem[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("")
 const [revision, setRevision] = useState(0), [open, setOpen] = useState(false), [editing, setEditing] = useState<AffiliationItem | null>(null), [viewing, setViewing] = useState(false)
 const [options, setOptions] = useState<AffiliationOptions | null>(null), [values, setValues] = useState<Record<string, string>>({}), [errors, setErrors] = useState<Record<string, string>>({}), [saving, setSaving] = useState(false), [uncertain, setUncertain] = useState(false)
 const submitting = useRef(false), alive = useRef(true)
 const endpoint = `/api/affiliations/${kind}/${encodeURIComponent(actorId)}`, config = affiliationConfig[kind], clubKind = config.fields.includes("id_club")
 useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
 useEffect(() => {
  const controller = new AbortController(); setLoading(true); setError(""); setItems([]); setOptions(null)
  const query = new URLSearchParams(); if (canWrite) query.set("editor", "1"); if (revision) query.set("fresh", "1")
  void apiFetch(`${endpoint}?${query}`, { signal: controller.signal }).then(async response => { const json = await readApiJson(response); if (!response.ok) throw Error(apiErrorMessage(response, json, "Lecture impossible.")); if (!controller.signal.aborted) { setItems(json.affiliations); setOptions(json.options || null); setUncertain(false) } }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Lecture impossible.") }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
  return () => controller.abort()
 }, [endpoint, revision, canWrite])
 const start = (item?: AffiliationItem, readOnly = false) => {
  if (saving || (uncertain && !readOnly)) return
  setEditing(item || null); setViewing(readOnly); setErrors({})
  setValues(Object.fromEntries(config.fields.map(field => [field, field.startsWith("date_") ? compactDateFromSheet(item?.values[field] || "") : item?.values[field] || ""]))); setOpen(true)
 }
 const close = () => { if (!saving) setOpen(false) }
 const submit = async (event: React.FormEvent) => {
  event.preventDefault(); if (submitting.current || viewing || uncertain || !options || options.issues.length) return
  submitting.current = true; setSaving(true); setErrors({})
  try {
   const response = await apiFetch(`${endpoint}${editing ? `/${encodeURIComponent(editing.id)}` : ""}`, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, ...(editing ? { version: editing.version } : {}) }) }), json = await readApiJson(response)
   if (!alive.current) return
   if (!response.ok) { setErrors({ ...json.error?.fields, _form: apiErrorMessage(response, json, "Enregistrement impossible."), ...(json.error?.code === "CONFLICT" ? { _conflict: "true" } : {}) }); if (json.error?.uncertain) setUncertain(true); return }
   setItems(current => [json.affiliation, ...current.filter(item => item.id !== json.affiliation.id)].sort((a, b) => b.values.date_debut.localeCompare(a.values.date_debut) || a.id.localeCompare(b.id))); setOpen(false); toast.success("Affiliation enregistrée et confirmée.")
  } catch { if (alive.current) { setUncertain(true); setErrors({ _form: "Réponse non reçue. Rechargez l’historique avant toute nouvelle tentative." }) } }
  finally { submitting.current = false; if (alive.current) setSaving(false) }
 }
 const set = (key: string, value: string) => setValues(old => ({ ...old, [key]: value, ...(key === "id_type_entite" ? { id_entite: "" } : {}) }))
 const readable: Record<string, string | undefined> = { id_club: editing?.target, id_entite: editing?.target, id_type_entite: editing?.typeLabel, id_statut_affiliation: editing?.status, statut_affiliation: editing?.status, id_fonction: editing?.functionLabel, id_saison: editing?.season }
 const field = (key: string, label: string, choices?: AffiliationOption[]) => <div key={key} className="space-y-2">
  <Label htmlFor={`aff-${key}`}>{label}</Label>
  {viewing ? <p id={`aff-${key}`} className="break-words text-sm">{choices?.find(option => option.id === values[key])?.label || readable[key] || values[key] || "—"}</p>
   : key === "id_club" ? <SearchSelect id={`aff-${key}`} value={values[key] || ""} onValueChange={value => set(key, value)} options={choices || []} placeholder="Rechercher un club" disabled={saving} invalid={!!errors[key]}/>
   : choices ? <Select value={values[key]} onValueChange={value => set(key, value)} disabled={saving}><SelectTrigger id={`aff-${key}`} aria-invalid={!!errors[key]}><SelectValue placeholder="Sélectionner"/></SelectTrigger><SelectContent>{choices.map(option => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select>
   : key === "observations" ? <Textarea id={`aff-${key}`} value={values[key] || ""} onChange={event => set(key, event.target.value)} disabled={saving}/>
   : key.startsWith("date_") ? <CompactDateInput id={`aff-${key}`} value={values[key] || ""} onValueChange={value => set(key, value)} optional={key === "date_fin"} disabled={saving} aria-invalid={!!errors[key]}/>
   : <Input id={`aff-${key}`} value={values[key] || ""} onChange={event => set(key, event.target.value)} disabled={saving}/>}
  {errors[key] && <p className="text-sm text-destructive">{errors[key]}</p>}
 </div>
 const columns: Column<AffiliationItem>[] = [{ key: "target", header: clubKind ? "Club" : "Entité" }, ...(kind === "officiels" ? [{ key: "functionLabel", header: "Fonction" }] : []), ...(kind === "autres-acteurs" ? [{ key: "season", header: "Saison" }] : []), { key: "dateStart", header: "Date de début", render: item => formatDateForDisplay(item.values.date_debut) }, { key: "dateEnd", header: "Date de fin", render: item => item.values.date_fin ? formatDateForDisplay(item.values.date_fin) : "En cours" }, { key: "status", header: "Statut", render: item => <StatusBadge status={item.status}/> }]
 const actions = (item: AffiliationItem) => <div className="flex justify-center gap-1"><Button variant="ghost" size="icon-sm" onClick={() => start(item, true)} aria-label={`Consulter ${item.id}`}><Eye/></Button>{canWrite && <Button variant="ghost" size="icon-sm" disabled={uncertain} onClick={() => start(item)} aria-label={`Modifier ${item.id}`}><Pencil/></Button>}</div>
 if (!clubKind) columns.splice(1, 0, { key: "typeLabel", header: "Type" })
 const cells = (item: AffiliationItem) => columns.map(column => column.render ? column.render(item) : String(item[column.key as keyof AffiliationItem] ?? "—"))
 return <Card><CardHeader className="flex-row flex-wrap items-center justify-between gap-3"><CardTitle>Affiliations</CardTitle><div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => { if (!loading && !saving) setRevision(value => value + 1) }} disabled={loading || saving} aria-label="Actualiser les affiliations" title="Actualiser"><RefreshCw className={loading ? "animate-spin" : ""}/></Button>{canWrite && <Button onClick={() => start()} disabled={loading || !!error || uncertain}><Plus/>Ajouter une affiliation</Button>}</div></CardHeader><CardContent className="space-y-4">
  {uncertain && <div role="alert" className="space-y-2 text-sm"><p>Une écriture est incertaine. Rechargez l’historique avant de continuer.</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Recharger l’historique</Button></div>}
  {items.some(item => item.anomaly) && <p role="alert" className="text-sm text-amber-500">Certaines entités sont introuvables. Les identifiants et l’historique sont conservés.</p>}
  {loading ? <p role="status">Chargement des affiliations…</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Réessayer</Button></div> : !items.length ? <p className="text-muted-foreground">Aucune affiliation enregistrée.</p> : <><div className="grid gap-3 md:hidden">{items.map(item => <div key={item.id} className="rounded-lg border p-4">{columns.map((column, index) => <div key={column.key} className="grid grid-cols-2 gap-2 py-1 text-sm"><span className="text-muted-foreground">{column.header}</span><span className="break-words">{cells(item)[index]}</span></div>)}{actions(item)}</div>)}</div><div className="hidden md:grid" style={{ gridTemplateColumns: `repeat(${columns.length},minmax(0,1fr)) 5rem` }}>{columns.map(column => <div key={column.key} className="border-b p-3 text-sm font-medium">{column.header}</div>)}<div className="border-b p-3 text-center text-sm font-medium">Actions</div>{items.map(item => <div key={item.id} className="contents">{cells(item).map((cell, index) => <div key={columns[index].key} className="min-w-0 break-words border-b p-3 text-sm">{cell}</div>)}<div className="border-b p-2">{actions(item)}</div></div>)}</div></>}
 </CardContent><Sheet open={open} onOpenChange={value => { if (!value) close() }}><SheetContent className="overflow-y-auto"><form onSubmit={submit} className="flex min-h-full flex-col"><SheetHeader><SheetTitle>{viewing ? "Consulter" : editing ? "Modifier" : "Ajouter"} une affiliation</SheetTitle><SheetDescription>Historique de l’acteur — identifiant immuable.{kind === "athletes" ? " L’athlète est lié directement à un club." : ""}</SheetDescription></SheetHeader><div className="flex-1 space-y-4 px-4 py-2">
 {!viewing && options?.issues.map(issue => <p role="alert" key={issue} className="text-sm text-amber-500">{issue}</p>)}
 {clubKind ? field("id_club", "Club", options?.clubs || []) : <>{field("id_type_entite", "Type d’entité", options?.entityTypes || [])}{field("id_entite", "Entité", options?.entities[values.id_type_entite] || [])}</>}
 {kind === "officiels" && field("id_fonction", "Fonction", options?.functions || [])}{kind === "autres-acteurs" && field("id_saison", "Saison", options?.seasons || [])}
 {field("date_debut", "Date de début")}{field("date_fin", "Date de fin (facultative)")}{field(kind === "autres-acteurs" ? "statut_affiliation" : "id_statut_affiliation", "Statut", options?.statuses || [])}{field("observations", "Observations")}
 {errors._form && <p role="alert" className="text-sm text-destructive">{errors._form}</p>}
 {errors._conflict && <Button type="button" variant="outline" onClick={() => { close(); setOptions(null); setRevision(value => value + 1) }}>Recharger l’historique</Button>}
 </div><SheetFooter>{!viewing && <Button type="submit" disabled={saving || !options || !!options.issues.length || uncertain}>{saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}</Button>}<Button type="button" variant="outline" disabled={saving} onClick={close}>Fermer</Button></SheetFooter></form></SheetContent></Sheet></Card>
}
