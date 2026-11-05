import { Shell } from "./shell"
import { Header } from "./header"
export function ModulePending({ title, comingSoon = false }: { title: string; comingSoon?: boolean }) {
  return <Shell bare><Header title={title} /><div className="p-4 sm:p-6"><section className="rounded-xl border border-border bg-card p-6"><h2 className="text-lg font-semibold">{comingSoon ? "Bientôt disponible" : "Module en préparation"}</h2><p className="mt-2 text-sm text-muted-foreground">{comingSoon ? "Ce module sera disponible prochainement." : `L’espace ${title} n’est pas encore disponible dans FECOT.`}</p></section></div></Shell>
}
