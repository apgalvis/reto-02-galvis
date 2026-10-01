import type { JsonRecord } from '@/types/agent';
export function TokenUsage({ usage }: { usage?: JsonRecord | undefined }) {
  const source = usage && typeof usage === 'object' ? usage : {};
  const input = source['inputTokens'] ?? source['input_tokens'] ?? source['prompt_tokens'] ?? source['input'];
  const output = source['outputTokens'] ?? source['output_tokens'] ?? source['completion_tokens'] ?? source['output'];
  const total = source['totalTokens'] ?? source['total_tokens'] ?? source['total'];
  const fmt = (value: unknown) => typeof value === 'number' ? value.toLocaleString('es-CO') : '—';
  return <div className="usage-grid"><div><span>Entrada</span><strong>{fmt(input)}</strong></div><div><span>Salida</span><strong>{fmt(output)}</strong></div><div><span>Total</span><strong>{fmt(total)}</strong></div></div>;
}