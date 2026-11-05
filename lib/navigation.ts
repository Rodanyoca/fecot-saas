export type NavigationIcon =
  | "dashboard"
  | "territory"
  | "league"
  | "entente"
  | "club"
  | "actors"
  | "athlete"
  | "coach"
  | "doctor"
  | "referee"
  | "official"
  | "other-actor"
  | "movement"
  | "license"
  | "competition"
  | "national-team"
  | "activity"
  | "document"
  | "settings"

export type NavigationItem = {
  name: string
  href?: string
  exact?: boolean
  icon?: NavigationIcon
  children?: readonly NavigationItem[]
}

export const dashboardNavigation: readonly NavigationItem[] = [
  { name: "Tableau de bord", href: "/", icon: "dashboard" },
  { name: "Structure territoriale", children: [
    { name: "Ligues", href: "/ligues", icon: "league" },
    { name: "Ententes", href: "/ententes", icon: "entente" },
    { name: "Clubs", href: "/clubs", icon: "club" },
  ] },
  { name: "Acteurs", children: [
    { name: "Athlètes", href: "/athletes", icon: "athlete" },
    { name: "Entraîneurs", href: "/coachs", icon: "coach" },
    { name: "Arbitres", href: "/arbitres", icon: "referee" },
    { name: "Médecins", href: "/medecins", icon: "doctor" },
    { name: "Officiels", href: "/officiels", icon: "official" },
    { name: "Autres acteurs", href: "/autres-acteurs", icon: "other-actor" },
  ] },
  { name: "Licences", children: [
    { name: "Athlètes", href: "/licences", icon: "license", exact: true },
    { name: "Entourage", href: "/licences/entourage", icon: "coach" },
  ] },
  { name: "Compétitions", children: [
    { name: "Compétitions", href: "/competitions", icon: "competition" },
  ] },
  { name: "Équipes nationales", children: [
    { name: "Équipes nationales", href: "/equipe-nationale", icon: "national-team" },
  ] },
  { name: "Administration", children: [
    { name: "Activités", href: "/activites", icon: "activity" },
    { name: "Documents", href: "/documents", icon: "document" },
  ] },
  { name: "Paramètres", href: "/parametres", icon: "settings" },
] as const

export function isNavigationItemActive(item: NavigationItem, pathname: string): boolean {
  if (item.children?.some((child) => isNavigationItemActive(child, pathname))) return true
  if (!item.href) return false
  if (item.href === "/" || item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/**
 * `usePathname` can expose a different URL during server rendering and the
 * browser's first render (notably after a rewrite or a prefetched transition).
 * The navigation therefore waits until hydration before marking a link active.
 */
export function hydrationSafePathname(pathname: string, hydrated: boolean): string {
  return hydrated ? pathname : ""
}

export const modules = [
  { slug: "structures", title: "Structures", description: "Organisation des structures affiliées à la fédération." },
  { slug: "acteurs", title: "Acteurs", description: "Identification des athlètes et de leur entourage." },
  { slug: "licences", title: "Licences", description: "Suivi des affiliations et des licences fédérales." },
  { slug: "competitions", title: "Compétitions", description: "Organisation des épreuves de taekwondo." },
  { slug: "administration", title: "Administration", description: "Activités et documents de la fédération." },
] as const
