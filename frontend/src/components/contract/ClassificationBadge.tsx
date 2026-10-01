import { Badge } from '@/components/ui/badge';
import type { ToolCall } from '@/types/agent';

const labels: Record<string, string> = { nuevo: 'Nuevo', actualizacion: 'Actualización', duplicado: 'Duplicado', rechazado: 'Rechazado', revision: 'Requiere revisión', registrado: 'Registrado', poliza_pendiente: 'Póliza pendiente', vence_60: 'Vence ≤ 60 días' };
const tone: Record<string, string> = { nuevo: 'status-info', actualizacion: 'status-info', duplicado: 'status-neutral', rechazado: 'status-danger', revision: 'status-warning', registrado: 'status-success', poliza_pendiente: 'status-warning', vence_60: 'status-warning' };
const map: Record<string, string> = { nuevo: 'nuevo', nueva: 'nuevo', actualizacion: 'actualizacion', actualización: 'actualizacion', duplicado: 'duplicado', duplicada: 'duplicado', rechazado: 'rechazado', rechazada: 'rechazado' };
function normalized(value: unknown): string | null { if (typeof value !== 'string') return null; return map[value.trim().toLowerCase()] ?? null; }
function obj(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; }
export function getStructuredBadges(calls: ToolCall[], needsConfirmation?: boolean): string[] {
  const found = new Set<string>();
  for (const call of calls) {
    const result = obj(call.result ?? call.output);
    if (!result) continue;
    const records = [result, obj(result['data']), obj(result['contrato']), obj(result['classification']), obj(result['clasificacion'])].filter((item): item is Record<string, unknown> => Boolean(item));
    for (const record of records) {
      const classification = normalized(record['clasificacion'] ?? record['classification'] ?? record['tipo']);
      if (classification) found.add(classification);
      if (record['registrado'] === true || record['registered'] === true) found.add('registrado');
      if (record['poliza_pendiente'] === true || record['policy_pending'] === true) found.add('poliza_pendiente');
      if (record['vence_60_dias'] === true || record['expiring_within_60_days'] === true) found.add('vence_60');
      if (record['requiere_revision'] === true || record['needs_review'] === true) found.add('revision');
    }
  }
  if (needsConfirmation) found.add('revision');
  return [...found];
}
export function ClassificationBadge({ value }: { value: string }) { return labels[value] ? <Badge variant="outline" className={tone[value]}>{labels[value]}</Badge> : null; }