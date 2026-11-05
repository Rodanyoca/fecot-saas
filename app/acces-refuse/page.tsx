import Link from "next/link"
export default function AccessDeniedPage() {
  return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-5 p-6"><h1 className="text-2xl font-bold">Accès non autorisé</h1><p>Votre compte ne dispose pas des autorisations nécessaires pour cette section ou cette action.</p><Link className="underline" href="/mon-compte">Voir mon compte</Link></main>
}
