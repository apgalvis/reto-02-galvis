import fs from "node:fs/promises"
import path from "node:path"
export async function loadAgentInstructions(directory:string){return fs.readFile(path.join(directory,"agent","prompt.md"),"utf8")}
