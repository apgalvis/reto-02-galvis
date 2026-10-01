import { FileText } from 'lucide-react';
import type { ToolCall } from '@/types/agent';
const artifactPattern = /(?:out\/alertas\.md|maestro-contratos\.csv|historial\.jsonl|sharepoint\/Contratos\/[^\s"'<>]+)/g;
export function getArtifacts(calls: ToolCall[]): string[] {
  const paths = new Set<string>();
  for (const call of calls) {
    const text = JSON.stringify(call.result ?? call.output ?? {});
    for (const match of text.matchAll(artifactPattern)) paths.add(match[0]);
  }
  return [...paths];
}
export function ArtifactCard({ path }: { path: string }) { return <div className="artifact-row"><FileText className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><div className="text-xs font-semibold">Artefacto generado</div><div className="break-all font-mono text-[11px] text-muted-foreground">{path}</div></div></div>; }