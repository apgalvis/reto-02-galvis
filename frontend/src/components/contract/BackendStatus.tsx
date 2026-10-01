import { Activity, WifiOff } from 'lucide-react';
import type { HealthResponse } from '@/types/agent';
export function BackendStatus({ health, preview, checking }: { health: HealthResponse | null; preview: boolean; checking: boolean }) {
  return <div className="backend-status"><span className={`status-indicator ${health?.ok ? 'bg-success' : 'bg-warning'}`} />{health?.ok ? <Activity className="h-3.5 w-3.5 text-success" /> : <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />}<span className="font-medium">{preview ? 'Vista previa · Sin conexión' : checking ? 'Comprobando...' : health?.ok ? 'Conectado' : 'Sin conexión'}</span>{health?.ok && <span className="hidden text-muted-foreground sm:inline">· {health.provider || 'Proveedor'} / {health.model || 'Modelo'}</span>}</div>;
}