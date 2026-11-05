import React from "react"
export function useRouter() { return { refresh: () => (window as unknown as { qaRefresh: () => void }).qaRefresh(), push: () => undefined, replace: () => undefined } }
const params = new URLSearchParams()
export function useSearchParams() { return params }
export function usePathname() { return "/ligues" }
export default function Link(props: React.ComponentProps<"a">) { return <a {...props} /> }
