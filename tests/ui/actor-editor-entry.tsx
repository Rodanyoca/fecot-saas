// Synthetic browser regression harness: no Google client or production configuration.
import React from "react"
import {createRoot} from "react-dom/client"
import {ActorEditor} from "@/components/actors/actor-editor"
const root=createRoot(document.getElementById("root")!)
const render=()=>root.render(<ActorEditor kind="athletes" canWrite onSaved={()=>{}}/>)
Object.assign(window,{qaEditorRender:render})
render()
