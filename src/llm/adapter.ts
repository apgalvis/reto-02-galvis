import type {LlmRequest,LlmResponse} from "./types.js"
export interface LlmAdapter{provider:string;model:string;send(req:LlmRequest):Promise<LlmResponse>}
