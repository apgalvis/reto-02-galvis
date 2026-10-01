import type {ExtractedContract} from "../domain/types.js"
export type ChatMessage={role:"user"|"assistant";content:string;ts:string}
export type VisibleToolCall={name:string;arguments:unknown;result:unknown}
export type PendingConfirmation={kind:"contract_review";mensaje_id:string;fields:string[];contract:ExtractedContract;createdAt:string}
export type AgentSession={id:string;messages:ChatMessage[];toolCalls:VisibleToolCall[];pendingConfirmation:PendingConfirmation|null;inputTokenUsage:number;outputTokenUsage:number;tokenUsage:number}
export class MemorySessionStore{private sessions=new Map<string,AgentSession>();getOrCreate(id:string){const old=this.sessions.get(id);if(old)return old;const s:AgentSession={id,messages:[],toolCalls:[],pendingConfirmation:null,inputTokenUsage:0,outputTokenUsage:0,tokenUsage:0};this.sessions.set(id,s);return s}get(id:string){return this.sessions.get(id)??null}}
