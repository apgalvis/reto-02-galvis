import { Bot, UserRound } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatEntry } from '@/types/agent';
import { ToolCallCard } from './ToolCallCard';
import { ConfirmationCard } from './ConfirmationCard';
export function ChatMessage({ entry, isLatestReview, busy, onDecision }: { entry: ChatEntry; isLatestReview: boolean; busy: boolean; onDecision: (approved: boolean) => void }) {
  const assistant = entry.role === 'assistant';
  return <article className={`message ${assistant ? 'message-agent' : 'message-user'}`}><div className={`message-avatar ${assistant ? 'agent-avatar' : 'user-avatar'}`}>{assistant ? <Bot className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center gap-2 text-xs"><span className="font-semibold">{assistant ? 'Agente contractual' : 'Tú'}</span>{entry.preview && <span className="text-muted-foreground">· Ejemplo de vista previa</span>}</div><div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.text}</ReactMarkdown></div>{entry.toolCalls?.length ? <div className="mt-3 space-y-2">{entry.toolCalls.map((call, i) => <ToolCallCard key={`${entry.id}-${i}`} call={call} index={i} />)}</div> : null}{entry.needsConfirmation && entry.pendingConfirmation && <div className="mt-3"><ConfirmationCard data={entry.pendingConfirmation} resolved={entry.resolved || !isLatestReview} busy={busy} onDecision={onDecision} /></div>}</div></article>;
}