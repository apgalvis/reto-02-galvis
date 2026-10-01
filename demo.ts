import fs from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {FixedClock} from "./src/core/clock.js"
import {executeTool} from "./src/core/tool.js"
import {tools} from "./src/tools/index.js"
import type {ExtractedContract} from "./src/domain/types.js"
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..")
await fs.rm(path.join(directory,"out"),{recursive:true,force:true})
const ctx={directory,sessionId:"demo",actor:"demo",clock:new FixedClock("2026-09-03T12:00:00Z")}
async function call(name:keyof typeof tools,args:unknown,messageId?:string){const raw=await executeTool(name,tools[name] as never,args as never,ctx,messageId?{mensaje_id:messageId}:undefined);return JSON.parse(raw) as {ok:boolean;data?:unknown;error?:string}}
const inbox=await call("contratos_leer_buzon",{})
console.log("Buzón:",JSON.stringify(inbox.data,null,2))
let msg006:ExtractedContract|null=null
for(const id of ["msg-001","msg-002","msg-003","msg-004","msg-005","msg-006"]){
  const ex=await call("contratos_extraer",{mensaje_id:id},id)
  if(!ex.ok){console.log(`${id}: rechazado — ${ex.error}`);continue}
  const contrato=ex.data as ExtractedContract
  const va=await call("contratos_validar",{mensaje_id:id,contrato},id)
  if(!va.ok){console.log(`${id}: error validando — ${va.error}`);continue}
  const v=va.data as {clasificacion:string;requiere_revision:string[];advertencias:string[]}
  console.log(`${id}: ${v.clasificacion}; revisión=[${v.requiere_revision.join(", ")}]; advertencias=[${v.advertencias.join("; ")}]`)
  if(id==="msg-006")msg006=contrato
  const reg=await call("contratos_registrar",{mensaje_id:id,contrato,confirmado:false},id)
  console.log(`  acción: ${reg.ok?JSON.stringify(reg.data):reg.error}`)
}
if(msg006){const reg=await call("contratos_registrar",{mensaje_id:"msg-006",contrato:msg006,confirmado:true},"msg-006");console.log("msg-006 segunda pasada confirmada:",reg.ok?reg.data:reg.error)}
const alerts=await call("contratos_alertas",{hoy:"2026-09-03"})
console.log("Alertas:",JSON.stringify(alerts.data,null,2))
