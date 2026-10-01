import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {FixedClock} from "../src/core/clock.js"
import {readInbox} from "../src/domain/buzon.js"
import {extractContract} from "../src/domain/extract.js"
import {validateContract} from "../src/domain/validate.js"
import {registerContract} from "../src/domain/register.js"
import {buildAlerts} from "../src/domain/alerts.js"
import {readOutMaster} from "../src/repositories/files.js"
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..","..")
const clock=new FixedClock("2026-09-03T12:00:00Z")
async function reset(){await fs.rm(path.join(directory,"out"),{recursive:true,force:true})}

test("buzón lista seis mensajes y detecta cotización",async()=>{await reset();const x=await readInbox(directory);assert.equal(x.mensajes.length,6);assert.equal(x.mensajes.find(m=>m.id==="msg-005")?.tiene_contrato,false)})

test("msg-001 es nuevo con póliza pendiente",async()=>{await reset();const c=await extractContract(directory,"msg-001");const v=await validateContract(directory,"msg-001",c,"2026-09-03");assert.equal(v.clasificacion,"nuevo");assert.deepEqual(v.requiere_revision,[]);assert.equal(v.registro?.valor,265000000);assert.equal(v.registro?.estado_poliza,"pendiente")})

test("msg-002 es nuevo sin póliza",async()=>{await reset();const c=await extractContract(directory,"msg-002");const v=await validateContract(directory,"msg-002",c,"2026-09-03");assert.equal(v.clasificacion,"nuevo");assert.equal(v.registro?.requiere_poliza,false);assert.equal(v.registro?.estado_poliza,"no_aplica")})

test("msg-003 actualiza valor y fecha fin",async()=>{await reset();const c=await extractContract(directory,"msg-003");const v=await validateContract(directory,"msg-003",c,"2026-09-03");assert.equal(v.clasificacion,"actualizacion");assert.equal(v.id_contrato_existente,"CT-2026-011");assert.equal(v.diferencias?.valor?.despues,520000);assert.equal(v.diferencias?.fecha_fin?.despues,"2027-11-01")})

test("msg-004 es duplicado según RN1",async()=>{await reset();const c=await extractContract(directory,"msg-004");const v=await validateContract(directory,"msg-004",c,"2026-09-03");assert.equal(v.clasificacion,"duplicado");assert.deepEqual(v.requiere_revision,[])})

test("msg-005 se rechaza como documento no contractual",async()=>{await reset();const c=await extractContract(directory,"msg-005");const v=await validateContract(directory,"msg-005",c,"2026-09-03");assert.equal(v.clasificacion,"rechazado")})

test("msg-006 requiere revisión de valor y fecha fin pero no bloquea por remitente",async()=>{await reset();const c=await extractContract(directory,"msg-006");const v=await validateContract(directory,"msg-006",c,"2026-09-03");assert.equal(v.clasificacion,"nuevo");assert.deepEqual(v.requiere_revision.sort(),["fecha_fin","valor"]);assert.match(v.advertencias.join(" "),/Remitente no registrado/);await assert.rejects(()=>registerContract(directory,"msg-006",c,false,clock),/requiere revisión/);const r=await registerContract(directory,"msg-006",c,true,clock);assert.equal(r.id_contrato,"CM-2026-03");const rows=await readOutMaster(directory);assert.equal(rows.find(x=>x.id_contrato==="CM-2026-03")?.valor,0);assert.equal(rows.find(x=>x.id_contrato==="CM-2026-03")?.fecha_fin,"2027-08-31")})

test("registro de otrosí conserva historial y actualiza maestro",async()=>{await reset();const c=await extractContract(directory,"msg-003");const r=await registerContract(directory,"msg-003",c,false,clock);assert.equal(r.accion,"actualizacion");const rows=await readOutMaster(directory);assert.equal(rows.find(x=>x.id_contrato==="CT-2026-011")?.valor,520000);const hist=await fs.readFile(path.join(directory,"out/sharepoint/historial.jsonl"),"utf8");assert.match(hist,/CT-2026-011/);assert.match(hist,/actualizacion/)})

test("alertas usan fecha determinística",async()=>{await reset();for(const id of ["msg-001","msg-002","msg-003"]){const c=await extractContract(directory,id);await registerContract(directory,id,c,false,clock)}const a=await buildAlerts(directory,"2026-09-03");assert(a.vencen.some(x=>x.id_contrato==="CT-2026-004"));assert(a.vencen.some(x=>x.id_contrato==="CT-2026-009"));assert(a.polizas_pendientes.some(x=>x.id_contrato==="CT-2026-015"));assert.equal(path.basename(a.ruta),"alertas.md")})

test("fixture maestro permanece inmutable",async()=>{await reset();const fixture=path.join(directory,"fixtures/reto-02/maestro-contratos.csv");const before=await fs.readFile(fixture,"utf8");const c=await extractContract(directory,"msg-001");await registerContract(directory,"msg-001",c,false,clock);const after=await fs.readFile(fixture,"utf8");assert.equal(after,before)})
