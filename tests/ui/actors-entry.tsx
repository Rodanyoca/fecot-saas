// Offline UI only. API requests are intercepted by the test runner and use synthetic data.
import React from "react"
import {createRoot} from "react-dom/client"
import {ActorsClient} from "@/components/actors/actors-client"
import {Toaster} from "sonner"
import type {ActorKind} from "@/lib/actors/model"
const root=createRoot(document.getElementById("root")!)
let kind:ActorKind="athletes",canWrite=true,key=0
const render=()=>root.render(<><ActorsClient key={key} kind={kind} canWrite={canWrite}/><Toaster/></>)
Object.assign(window,{qaActors:(next:ActorKind,writable=true)=>{kind=next;canWrite=writable;key++;render()},qaRefresh:render})
render()
