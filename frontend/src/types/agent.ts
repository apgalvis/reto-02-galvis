export type JsonRecord = Record<string, unknown>;
export type ToolName = 'contratos_leer_buzon' | 'contratos_extraer' | 'contratos_validar' | 'contratos_registrar' | 'contratos_alertas' | string;
export interface ToolCall { name: ToolName; arguments?: unknown; args?: unknown; summary?: string; result?: unknown; output?: unknown; [key: string]: unknown }
export interface ReviewField { name?: string; field?: string; campo?: string; value?: unknown; valor?: unknown; confidence?: number; confianza?: number; reason?: string; motivo?: string; [key: string]: unknown }
export interface PendingConfirmation { kind: 'contract_review' | string; mensaje_id?: string; fields?: Array<ReviewField | string>; [key: string]: unknown }
export interface TokenCounts { input?: number; output?: number; total?: number }
export interface ChatResponse { reply: string; toolCalls?: ToolCall[]; needsConfirmation?: boolean; pendingConfirmation?: PendingConfirmation | null; usage?: JsonRecord; sessionId?: string }
export interface ChatEntry { id: string; role: 'user' | 'assistant'; text: string; toolCalls?: ToolCall[] | undefined; usage?: JsonRecord | undefined; pendingConfirmation?: PendingConfirmation | null | undefined; needsConfirmation?: boolean | undefined; resolved?: boolean | undefined; preview?: boolean | undefined }
export interface SessionResponse { sessionId?: string; id?: string; messages?: unknown[]; history?: unknown[]; historial?: unknown[]; [key: string]: unknown }
export interface HealthResponse { ok: boolean; provider?: string; model?: string }
export const TOOL_LABELS: Record<string, string> = {
  contratos_leer_buzon: 'Leer buzón', contratos_extraer: 'Extraer datos', contratos_validar: 'Validar contrato', contratos_registrar: 'Registrar contrato', contratos_alertas: 'Consultar alertas',
};
export const INBOX = [
  { id: 'msg-001', subject: 'Contrato de servicios', type: 'Nuevo · con póliza', tone: 'info' },
  { id: 'msg-002', subject: 'Contrato de suministro', type: 'Nuevo · sin póliza', tone: 'warning' },
  { id: 'msg-003', subject: 'Otrosí contractual', type: 'Actualización', tone: 'info' },
  { id: 'msg-004', subject: 'Documento repetido', type: 'Duplicado', tone: 'neutral' },
  { id: 'msg-005', subject: 'Cotización comercial', type: 'Rechazado', tone: 'danger' },
  { id: 'msg-006', subject: 'Datos por verificar', type: 'Revisión humana', tone: 'warning' },
] as const;