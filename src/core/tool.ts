import {z} from "zod"
import type {ToolContext} from "./types.js"
import {appendToolLog} from "./log.js"

export type ToolDef<T extends z.ZodTypeAny>={
  description:string
  args:T
  parameters:Record<string,unknown>
  execute(args:z.infer<T>,ctx:ToolContext):Promise<string>
}

function parseResult(raw:string):{ok:boolean;summary:string}{
  try{
    const value=JSON.parse(raw) as {ok?:unknown;error?:unknown;data?:unknown}
    if(value.ok===true)return{ok:true,summary:"ejecución correcta"}
    return{ok:false,summary:typeof value.error==="string"?value.error:"error de herramienta"}
  }catch{return{ok:false,summary:"respuesta de herramienta no JSON"}}
}

export async function executeTool<T extends z.ZodTypeAny>(name:string,tool:ToolDef<T>,raw:unknown,ctx:ToolContext,meta?:{mensaje_id?:string}){
  let result:string
  try{
    const args=tool.args.parse(raw)
    result=await tool.execute(args,ctx)
  }catch(error){
    result=JSON.stringify({ok:false,error:error instanceof Error?error.message:"Error inesperado"})
  }
  const parsed=parseResult(result)
  await appendToolLog(ctx.directory,{ts:ctx.clock.now().toISOString(),herramienta:name,...(meta?.mensaje_id?{mensaje_id:meta.mensaje_id}:{}),ok:parsed.ok,resumen:parsed.summary})
  return result
}
