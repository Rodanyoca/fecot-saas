import { notFound, redirect } from "next/navigation"
const routes: Record<string, string> = { structures: "/ligues", acteurs: "/athletes", licences: "/licences", competitions: "/competitions", administration: "/activites" }
export function generateStaticParams() { return Object.keys(routes).map(slug => ({ slug })) }
export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params
 if (!routes[slug]) notFound()
 redirect(routes[slug])
}
