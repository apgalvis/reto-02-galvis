import {z} from "zod"
import {readInbox} from "../domain/buzon.js"
import {extractContract} from "../domain/extract.js"
import {validateContract} from "../domain/validate.js"
import {registerContract} from "../domain/register.js"
import {buildAlerts} from "../domain/alerts.js"
import type {ExtractedContract} from "../domain/types.js"
import type {ToolContext} from "../core/types.js"

const F=z.object({valor:z.unknown().nullable(),confianza:z.number().min(0).max(1),fuente:z.string()})
const ContractSchema=z.object({
 tipo_documento:z.enum(["contrato","otrosi","otro"]),
 id_contrato:F,cliente:F,nit_cliente:F,pais:F,objeto:F,valor:F,valor_indeterminado:F,moneda:F,fecha_inicio:F,fecha_fin:F,requiere_poliza:F,tipo_poliza:F,comercial:F,
})
export const leer_buzon={description:"Lista los mensajes pendientes del buzón y señala cuáles traen un contrato.",args:z.object({}),parameters:{type:"object",properties:{},additionalProperties:false},async execute(_args:{},ctx:ToolContext){return readInbox(ctx.directory)}}
export const extraer={description:"Extrae de forma determinística los campos del contrato con confianza por campo.",args:z.object({mensaje_id:z.string().describe("ID del mensaje, por ejemplo msg-001")}),parameters:{type:"object",properties:{mensaje_id:{type:"string"}},required:["mensaje_id"],additionalProperties:false},async execute(args:{mensaje_id:string},ctx:ToolContext){return extractContract(ctx.directory,args.mensaje_id)}}
export const validar={description:"Clasifica el contrato como nuevo, actualización, duplicado o rechazado y reporta campos que requieren revisión.",args:z.object({mensaje_id:z.string(),contrato:ContractSchema}),parameters:{type:"object",properties:{mensaje_id:{type:"string"},contrato:{type:"object"}},required:["mensaje_id","contrato"],additionalProperties:false},async execute(args:{mensaje_id:string;contrato:ExtractedContract},ctx:ToolContext){return validateContract(ctx.directory,args.mensaje_id,args.contrato,ctx.clock.now().toISOString().slice(0,10))}}
export const registrar={description:"Registra o actualiza un contrato validado, archiva el adjunto y conserva historial; bloquea si requiere revisión sin confirmación.",args:z.object({mensaje_id:z.string(),contrato:ContractSchema,confirmado:z.boolean().optional()}),parameters:{type:"object",properties:{mensaje_id:{type:"string"},contrato:{type:"object"},confirmado:{type:"boolean"}},required:["mensaje_id","contrato"],additionalProperties:false},async execute(args:{mensaje_id:string;contrato:ExtractedContract;confirmado?:boolean},ctx:ToolContext){return registerContract(ctx.directory,args.mensaje_id,args.contrato,args.confirmado===true,ctx.clock)}}
export const alertas={description:"Genera el reporte de contratos que vencen pronto, pólizas pendientes y registros desde el corte del maestro.",args:z.object({hoy:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Fecha de referencia YYYY-MM-DD")}),parameters:{type:"object",properties:{hoy:{type:"string"}},required:["hoy"],additionalProperties:false},async execute(args:{hoy:string},ctx:ToolContext){return buildAlerts(ctx.directory,args.hoy)}}
