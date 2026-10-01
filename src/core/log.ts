import fs from "node:fs/promises"
import path from "node:path"
import {outPath} from "./fileGuard.js"
export async function appendToolLog(directory:string,entry:{ts:string;herramienta:string;mensaje_id?:string;ok:boolean;resumen:string}){const file=outPath(directory,"log.jsonl");await fs.mkdir(path.dirname(file),{recursive:true});await fs.appendFile(file,JSON.stringify(entry)+"\n","utf8")}
