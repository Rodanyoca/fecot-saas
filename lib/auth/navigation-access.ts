// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { routePolicy } from "./route-policy.ts"
import type { NavigationItem } from "../navigation.ts"
import type { AuthorizationBlock } from "../users/types.ts"
export type NavigationAccess = { estSuperAdmin: boolean; access: Partial<Record<`${AuthorizationBlock}:READ` | `${AuthorizationBlock}:WRITE`, boolean>> }
export function filterNavigation(items: readonly NavigationItem[], user: NavigationAccess | null): NavigationItem[] {
  if (!user) return []
  return items.flatMap(item => {
    if (item.children) {
      const children = filterNavigation(item.children, user)
      return children.length ? [{ ...item, children }] : []
    }
    const policy = item.href ? routePolicy(item.href) : null
    if (!policy) return []
    const allowed = user.estSuperAdmin || (policy.scope === "BUSINESS" && policy.blocks.some(block => user.access[`${block}:READ`]))
    return allowed ? [item] : []
  })
}
