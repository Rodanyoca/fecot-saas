"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { apiFetch, apiErrorMessage, readApiJson } from "@/lib/api/client"
import { formatDateForDisplay } from "@/lib/compact-date"
import type { ActorKind } from "@/lib/actors/model"
import type { LicenceView } from "@/lib/licences/model"
export function LicenceHistory({ kind, actorId }: { kind: ActorKind; actorId: string }) {
 const [rows, setRows] = useState<LicenceView[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [retry, setRetry] = useState(0)
 useEffect(() => {
  const controller = new AbortController(); setLoading(true); setError(""); setRows([])
  const query = new URLSearchParams({ kind, actorId }); if (retry) query.set("fresh", "1")
  void apiFetch(`/api/licences/${kind === "athletes" ? "athletes" : "acteurs"}?${query}`, { signal: controller.signal }).then(async response => { const json = await readApiJson(response); if (!response.ok) throw Error(apiErrorMessage(response, json, "Historique indisponible.")); if (!controller.signal.aborted) setRows(json.rows) }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Historique indisponible.") }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
  return () => controller.abort()
 }, [kind, actorId, retry])
 const athlete = kind === "athletes", headers = athlete ? ["Saison", "Numéro", "Structure", "Délivrée le", "Statut"] : ["Numéro", "Délivrée le", "Validité", "Statut"]
 return <Card><CardHeader><CardTitle>Historique des licences</CardTitle></CardHeader><CardContent>{loading ? <p role="status">Chargement des licences…</p> : error ? <div role="alert"><p className="text-destructive">{error}</p><Button variant="outline" className="mt-3" onClick={() => setRetry(n => n + 1)}>Réessayer</Button></div> : <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow>{headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map(row => <TableRow key={row.id}>{athlete && <TableCell>{row.season || "—"}</TableCell>}<TableCell className="font-mono">{row.number}</TableCell>{athlete && <TableCell>{row.target}</TableCell>}<TableCell>{formatDateForDisplay(row.dateDelivery) || "—"}</TableCell>{!athlete && <TableCell>{formatDateForDisplay(row.start) || "—"} — {formatDateForDisplay(row.end) || "—"}</TableCell>}<TableCell><StatusBadge status={row.effective.replaceAll("_", " ")}/></TableCell></TableRow>)}{!rows.length && <TableRow><TableCell colSpan={headers.length} className="h-24 text-center text-muted-foreground">Aucune licence enregistrée.</TableCell></TableRow>}</TableBody></Table></div>}</CardContent></Card>
}
