"use client"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTerritory } from "./context"
export function SelectCity({ provinceId, value, onChange }: { provinceId: string; value: string; onChange: (id: string) => void }) {
  const { cities } = useTerritory()
  const options = cities.filter(city => city.provinceId === provinceId)
  return <div className="space-y-2"><Label>Ville</Label><Select value={value || "none"} onValueChange={id => onChange(id === "none" ? "" : id)} disabled={!provinceId}><SelectTrigger aria-label="Ville"><SelectValue placeholder="Sélectionner une ville" /></SelectTrigger><SelectContent><SelectItem value="none">Non renseignée</SelectItem>{options.map(city => <SelectItem key={city.id} value={city.id}>{city.nom}</SelectItem>)}</SelectContent></Select></div>
}
