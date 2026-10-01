export type LlmInputItem=Record<string,unknown>|{role:"user"|"assistant";content:string}
export type LlmFunctionTool={type:"function";name:string;description:string;parameters:Record<string,unknown>;strict?:boolean}
export type LlmToolCall={callId:string;name:string;arguments:unknown}
export type LlmRequest={instructions:string;input:LlmInputItem[];tools:LlmFunctionTool[]}
export type LlmResponse={id:string;text:string;output:LlmInputItem[];toolCalls:LlmToolCall[];usage:{inputTokens:number;outputTokens:number;totalTokens:number}}
