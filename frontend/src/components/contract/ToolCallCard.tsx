import { ChevronDown, Code2 } from 'lucide-react';
import type { ToolCall } from '@/types/agent';
import { TOOL_LABELS } from '@/types/agent';
import { ArtifactCard, getArtifacts } from './ArtifactCard';
import { ClassificationBadge, getStructuredBadges } from './ClassificationBadge';
export function ToolCallCard({ call, index }: { call: ToolCall; index: number }) {
  const artifacts = getArtifacts([call]);
  return <div className="tool-card">
    <div className="flex items-start gap-3"><div className="tool-icon"><Code2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-foreground">{TOOL_LABELS[call.name] ?? call.name}</span><span className="font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span></div><p className="mt-0.5 break-words text-xs text-muted-foreground">{call.summary || call.name}</p></div></div>
    <div className="mt-2 flex flex-wrap gap-1.5">{getStructuredBadges([call]).map(value => <ClassificationBadge key={value} value={value} />)}</div>
    {artifacts.map(path => <ArtifactCard key={path} path={path} />)}
    <details className="technical-details"><summary><span>Argumentos</span><ChevronDown className="h-3.5 w-3.5" /></summary><pre>{JSON.stringify(call.arguments ?? call.args ?? {}, null, 2)}</pre></details>
    <details className="technical-details"><summary><span>JSON completo</span><ChevronDown className="h-3.5 w-3.5" /></summary><pre>{JSON.stringify(call, null, 2)}</pre></details>
  </div>;
}