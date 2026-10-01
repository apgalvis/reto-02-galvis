import type { ChatResponse, HealthResponse, SessionResponse } from '@/types/agent';

// VITE_API_BASE_URL tiene prioridad; sin override se usa el proxy same-origin
// hacia el backend de producción (evita restricciones de origen del servicio).
const FALLBACK_API_BASE_URL = '/api/proxy';
export const API_BASE_URL = (import.meta.env['VITE_API_BASE_URL'] || FALLBACK_API_BASE_URL).replace(/\/$/, '');
export const IS_PREVIEW = !API_BASE_URL;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) throw new Error('Modo vista previa: configura VITE_API_BASE_URL para conectar el servicio.');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  } catch {
    throw new Error('No se pudo conectar con el servicio. Verifica la conexión e inténtalo de nuevo.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body && typeof body === 'object' && ('message' in body || 'error' in body) ? String(body.message ?? body.error) : `Error del servicio (${response.status})`;
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<T>;
}
export const getHealth = () => request<HealthResponse>('/api/health');
export const sendChat = (sessionId: string, message: string) => request<ChatResponse>('/api/chat', { method: 'POST', body: JSON.stringify({ sessionId, message }) });
export const getSession = (sessionId: string) => request<SessionResponse>(`/api/sessions/${encodeURIComponent(sessionId)}`);