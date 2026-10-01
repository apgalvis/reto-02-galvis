import {readEmail,readOutMaster} from "../repositories/files.js"
import type {ExtractedContract,MasterRow,ValidationResult} from "./types.js"
import {similarity} from "./similarity.js"

const value=<T>(x:{valor:T|null})=>x.valor
const required:[keyof ExtractedContract,string][]=[
  ["cliente","cliente"],["nit_cliente","nit_cliente"],["pais","pais"],["objeto","objeto"],
  ["valor","valor"],["moneda","moneda"],["fecha_inicio","fecha_inicio"],["fecha_fin","fecha_fin"],["requiere_poliza","requiere_poliza"],
]

export async function validateContract(directory:string,messageId:string,c:ExtractedContract,now:string):Promise<ValidationResult>{
  const mail=await readEmail(directory,messageId)
  const rows=await readOutMaster(directory)
  if(c.tipo_documento==="otro")return{clasificacion:"rechazado",requiere_revision:[],advertencias:["Documento no contractual"]}

  const id=value(c.id_contrato)
  const nit=value(c.nit_cliente)
  const obj=value(c.objeto)
  let existing=id?rows.find(r=>r.id_contrato===id):undefined
  if(!existing&&nit&&obj)existing=rows.find(r=>r.nit_cliente===nit&&similarity(r.objeto,obj)>=0.9)

  const revisions:string[]=[]
  if(c.tipo_documento!=="otrosi"){
    for(const [k,label] of required){
      const f=c[k]
      if(typeof f==="object"&&f!==null&&"confianza" in f&&typeof f.confianza==="number"&&f.confianza<0.8)revisions.push(label)
    }
  }else{
    for(const k of ["valor","fecha_fin"] as const){
      const f=c[k]
      if(f.valor!==null&&f.confianza<0.8)revisions.push(k)
    }
  }

  const warnings:string[]=[]
  if(c.comercial.valor===null)warnings.push(`Remitente no registrado: ${mail.de}`)

  if(existing){
    const norm=(x:string)=>x.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")
    if(c.nit_cliente.valor&&c.nit_cliente.valor!==existing.nit_cliente)revisions.push("nit_cliente (conflicto con maestro)")
    if(c.pais.valor&&c.pais.valor!==existing.pais)revisions.push("pais (conflicto con maestro)")
    if(c.cliente.valor&&norm(c.cliente.valor)!==norm(existing.cliente))revisions.push("cliente (conflicto con maestro)")
  }

  if(!existing){
    if(!value(c.cliente)||!obj){
      return{clasificacion:"rechazado",requiere_revision:[...new Set(revisions)],advertencias:[...warnings,"No se identificaron partes y objeto"]}
    }
    const autoId=id??nextAutoId(rows,c.fecha_inicio.valor??now)
    const row=makeNew(c,now,autoId)
    return{
      clasificacion:"nuevo",
      requiere_revision:[...new Set(revisions)],
      advertencias:id?warnings:[...warnings,`ID derivado automáticamente: ${autoId}`],
      registro:row,
    }
  }

  const sameId=Boolean(id&&existing.id_contrato===id)
  const sameDuplicateKeys=
    sameId&&
    c.tipo_documento!=="otrosi"&&
    (c.valor.valor??existing.valor)===existing.valor&&
    (c.fecha_inicio.valor??existing.fecha_inicio)===existing.fecha_inicio&&
    (c.fecha_fin.valor??existing.fecha_fin)===existing.fecha_fin

  if(sameDuplicateKeys){
    return{
      clasificacion:"duplicado",
      id_contrato_existente:existing.id_contrato,
      requiere_revision:[],
      advertencias:warnings,
      registro:existing,
    }
  }

  const merged=mergeExisting(existing,c)
  const diffs=diff(existing,merged)
  return{
    clasificacion:"actualizacion",
    id_contrato_existente:existing.id_contrato,
    requiere_revision:[...new Set(revisions)],
    advertencias:warnings,
    diferencias:diffs,
    registro:merged,
  }
}

function nextAutoId(rows:MasterRow[],date:string){
  const year=date.match(/^\d{4}/)?.[0]??new Date().getUTCFullYear().toString()
  const prefix=`AUTO-${year}-`
  const max=rows
    .filter(r=>r.id_contrato.startsWith(prefix))
    .map(r=>Number(r.id_contrato.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((a,b)=>Math.max(a,b),0)
  return `${prefix}${String(max+1).padStart(4,"0")}`
}

function makeNew(c:ExtractedContract,now:string,idOverride?:string):MasterRow{
  const req=Boolean(c.requiere_poliza.valor)
  return{
    id_contrato:idOverride??c.id_contrato.valor??"",
    cliente:c.cliente.valor??"",
    nit_cliente:c.nit_cliente.valor??"",
    pais:c.pais.valor??"CO",
    objeto:(c.objeto.valor??"").slice(0,200),
    valor:c.valor.valor??0,
    moneda:c.moneda.valor??"COP",
    fecha_inicio:c.fecha_inicio.valor??"",
    fecha_fin:c.fecha_fin.valor??"",
    requiere_poliza:req,
    tipo_poliza:req?(c.tipo_poliza.valor??""):"",
    estado_poliza:req?"pendiente":"no_aplica",
    comercial:c.comercial.valor??"",
    ruta_sharepoint:"",
    fecha_registro:now,
    fuente:"buzon",
  }
}

function mergeExisting(e:MasterRow,c:ExtractedContract):MasterRow{
  return{
    ...e,
    id_contrato:c.id_contrato.valor??e.id_contrato,
    cliente:c.cliente.valor??e.cliente,
    nit_cliente:c.nit_cliente.valor??e.nit_cliente,
    pais:c.pais.valor??e.pais,
    objeto:(c.objeto.valor??e.objeto).slice(0,200),
    valor:c.valor.valor??e.valor,
    moneda:c.moneda.valor??e.moneda,
    fecha_inicio:c.fecha_inicio.valor??e.fecha_inicio,
    fecha_fin:c.fecha_fin.valor??e.fecha_fin,
    requiere_poliza:c.requiere_poliza.valor??e.requiere_poliza,
    tipo_poliza:c.tipo_poliza.valor??e.tipo_poliza,
    estado_poliza:e.estado_poliza,
    comercial:c.comercial.valor??e.comercial,
    fecha_registro:e.fecha_registro,
    fuente:e.fuente,
  }
}

function diff(a:MasterRow,b:MasterRow){
  const keys:(keyof MasterRow)[]=["valor","fecha_inicio","fecha_fin","objeto","requiere_poliza","tipo_poliza"]
  const out:Record<string,{antes:unknown;despues:unknown}>={}
  for(const k of keys){
    if(a[k]!==b[k])out[k]={antes:a[k],despues:b[k]}
  }
  return out
}
