import React,{useSyncExternalStore} from "react"
const subscribe=(notify:()=>void)=>{window.addEventListener("popstate",notify);return()=>window.removeEventListener("popstate",notify)}
const location=()=>window.location.pathname+window.location.search
export function usePathname(){useSyncExternalStore(subscribe,location);return window.location.pathname}
export function useSearchParams(){useSyncExternalStore(subscribe,location);return new URLSearchParams(window.location.search)}
const push=(url:string)=>{window.history.pushState({},"",url);window.dispatchEvent(new PopStateEvent("popstate"))}
export function useRouter(){return {push,replace:push,refresh:()=>window.dispatchEvent(new PopStateEvent("popstate"))}}
export default function Link({prefetch:_,...props}:React.ComponentProps<"a">&{prefetch?:boolean}){return <a {...props} onClick={event=>{props.onClick?.(event);if(!event.defaultPrevented&&props.href?.startsWith("/")&&!event.ctrlKey&&!event.metaKey){event.preventDefault();push(props.href)}}}/>}
