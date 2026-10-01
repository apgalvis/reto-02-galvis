import fs from "node:fs/promises"
import path from "node:path"
import {projectPath,outPath} from "../core/fileGuard.js"
import {parseMaster,serializeMaster} from "../domain/csv.js"
import type {MasterRow} from "../domain/types.js"
export type Email={id:string;de:string;para:string;asunto:string;fecha:string;cuerpo:string;adjuntos:string[]}
export async function readEmail(directory:string,id:string):Promise<Email>{const p=projectPath(directory,"fixtures","reto-02","buzon",id,"correo.json");return JSON.parse(await fs.readFile(p,"utf8")) as Email}
export async function readAttachment(directory:string,id:string,name:string){return fs.readFile(projectPath(directory,"fixtures","reto-02","buzon",id,name),"utf8")}
export async function listMessageIds(directory:string){const dir=projectPath(directory,"fixtures","reto-02","buzon");const entries=await fs.readdir(dir,{withFileTypes:true});return entries.filter(x=>x.isDirectory()).map(x=>x.name).sort()}
export async function readCommercials(directory:string){return JSON.parse(await fs.readFile(projectPath(directory,"fixtures","reto-02","comerciales.json"),"utf8")) as Array<{email:string;nombre:string;region:string}>}
export async function fixtureMaster(directory:string){return parseMaster(await fs.readFile(projectPath(directory,"fixtures","reto-02","maestro-contratos.csv"),"utf8"))}
export async function ensureOutMaster(directory:string){const p=outPath(directory,"sharepoint","maestro-contratos.csv");try{await fs.access(p)}catch{await fs.mkdir(path.dirname(p),{recursive:true});await fs.copyFile(projectPath(directory,"fixtures","reto-02","maestro-contratos.csv"),p)}return p}
export async function readOutMaster(directory:string){const p=await ensureOutMaster(directory);return parseMaster(await fs.readFile(p,"utf8"))}
export async function writeOutMaster(directory:string,rows:MasterRow[]){const p=await ensureOutMaster(directory);await fs.writeFile(p,serializeMaster(rows),"utf8");return p}
export async function readProcessed(directory:string):Promise<string[]>{try{return JSON.parse(await fs.readFile(outPath(directory,"procesados.json"),"utf8")) as string[]}catch{return[]}}
export async function markProcessed(directory:string,id:string){const xs=await readProcessed(directory);if(!xs.includes(id))xs.push(id);const p=outPath(directory,"procesados.json");await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,JSON.stringify(xs.sort(),null,2)+"\n","utf8")}
export async function appendHistory(directory:string,value:unknown){const p=outPath(directory,"sharepoint","historial.jsonl");await fs.mkdir(path.dirname(p),{recursive:true});await fs.appendFile(p,JSON.stringify(value)+"\n","utf8")}
export async function archiveAttachment(directory:string,msg:string,row:MasterRow,attachment:string){const slug=row.cliente.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");const ext=path.extname(attachment)||".txt";const rel=path.join("Contratos",row.fecha_inicio.slice(0,4),slug,`${row.id_contrato}${ext}`);const dest=outPath(directory,"sharepoint",rel);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(projectPath(directory,"fixtures","reto-02","buzon",msg,attachment),dest);return rel.replaceAll(path.sep,"/")}
