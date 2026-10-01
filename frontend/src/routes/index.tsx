import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BellRing, ChevronRight, CircleHelp, ClipboardList, Command, Menu, Plus, Send, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from '@/components/contract/ChatMessage';
import { InboxSelector } from '@/components/contract/InboxSelector';
import { BackendStatus } from '@/components/contract/BackendStatus';
import { TokenUsage } from '@/components/contract/TokenUsage';
import { AlertsSummary } from '@/components/contract/AlertsSummary';
import { ClassificationBadge, getStructuredBadges } from '@/components/contract/ClassificationBadge';
import { ApiError, getHealth, getSession, IS_PREVIEW, sendChat } from '@/lib/api';
import { TOOL_LABELS, type ChatEntry, type ChatResponse, type HealthResponse, type JsonRecord, type PendingConfirmation, type ToolCall } from '@/types/agent';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Centro de Control Contractual | Periferia IT Group' },
    { name: 'description', content: 'Consola de operaciones para revisar, clasificar y registrar contratos vigentes con supervisión humana.' },
    { property: 'og:title', content: 'Centro de Control Contractual | Periferia IT Group' },
    { property: 'og:description', content: 'Revisión contractual, clasificación estructurada y alertas en una sola consola.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ContractConsole,
});

const SESSION_KEY = 'periferia-contract-session-id';
const ALL_PROMPT = 'Procesa el buzón de contratos con fecha de hoy 2026-09-03. Registra lo que esté limpio, muéstrame lo que requiere revisión campo por campo y termina con el reporte de alertas. No registres nada dudoso sin preguntarme.';
const previewEntry: ChatEntry = {
  id: 'preview-example', role: 'assistant', preview: true,
  text: '### Vista de ejemplo: revisión de contrato\n\nLa clasificación y los campos extraídos se muestran aquí cuando el servicio responde. La siguiente información es **ilustrativa** y no se ha registrado ningún contrato.\n\n| Campo | Valor de ejemplo | Confianza |\n| --- | --- | ---: |\n| Tipo | Contrato de servicios | 98 % |\n| Fecha de vencimiento | Por verificar | 62 % |',
  toolCalls: [
    { name: 'contratos_extraer', arguments: { mensaje_id: 'msg-006' }, summary: 'Extracción estructurada · ejemplo visual', result: { mensaje_id: 'msg-006', campos: [{ campo: 'fecha_vencimiento', confianza: 0.62 }] } },
    { name: 'contratos_validar', arguments: { mensaje_id: 'msg-006' }, summary: 'Validación pendiente de revisión humana · ejemplo visual', result: { clasificacion: 'nuevo', requiere_revision: true } },
  ],
  needsConfirmation: true,
  pendingConfirmation: { kind: 'contract_review', mensaje_id: 'msg-006', fields: [{ campo: 'fecha_vencimiento', valor: 'Por verificar', confianza: 0.62, motivo: 'La fecha requiere verificación con el documento original.' }] },
  resolved: true,
};

function asRecord(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function normalizeTool(value: unknown): ToolCall | null {
  const object = asRecord(value);
  if (!object) return null;
  const name = object['name'] ?? object['tool'] ?? object['toolName'];
  return typeof name === 'string' ? { ...object, name } : null;
}
function normalizeEntry(value: unknown, index: number): ChatEntry | null {
  const object = asRecord(value);
  if (!object) return null;
  const role = object['role'] === 'user' || object['role'] === 'usuario' ? 'user' : 'assistant';
  const text = object['text'] ?? object['content'] ?? object['message'] ?? object['reply'];
  const tools = object['toolCalls'] ?? object['tool_calls'];
  const pending = asRecord(object['pendingConfirmation'] ?? object['pending_confirmation']);
  return {
    id: String(object['id'] ?? `history-${index}`), role,
    text: typeof text === 'string' ? text : '',
    toolCalls: Array.isArray(tools) ? tools.map(normalizeTool).filter((call): call is ToolCall => call !== null) : [],
    usage: asRecord(object['usage']) ?? undefined,
    needsConfirmation: object['needsConfirmation'] === true || object['needs_confirmation'] === true,
    pendingConfirmation: pending as PendingConfirmation | null,
    resolved: object['resolved'] === true,
  };
}
function responseEntry(response: ChatResponse): ChatEntry {
  return { id: crypto.randomUUID(), role: 'assistant', text: response.reply || '', toolCalls: response.toolCalls ?? [], usage: response.usage, needsConfirmation: response.needsConfirmation, pendingConfirmation: response.pendingConfirmation };
}
function ContractConsole() {
  const [sessionId, setSessionId] = useState('');
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checking, setChecking] = useState(!IS_PREVIEW);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobilePanel, setMobilePanel] = useState<'inbox' | 'activity' | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionGeneration = useRef(0);

  useEffect(() => {
    const existing = sessionStorage.getItem(SESSION_KEY);
    const id = existing || crypto.randomUUID();
    const generation = sessionGeneration.current;
    if (!existing) sessionStorage.setItem(SESSION_KEY, id);
    setSessionId(id);
    if (IS_PREVIEW) return;
    let active = true;
    getHealth().then(result => { if (active) setHealth(result); }).catch(() => { if (active) setHealth(null); }).finally(() => { if (active) setChecking(false); });
    if (existing) {
      setRestoring(true);
      getSession(id).then(session => {
        if (!active || sessionGeneration.current !== generation) return;
        const raw = session.messages ?? session.history ?? session.historial ?? [];
        if (Array.isArray(raw)) setEntries(raw.map(normalizeEntry).filter((entry): entry is ChatEntry => entry !== null));
      }).catch((cause: unknown) => {
        if (!active || sessionGeneration.current !== generation) return;
        if (cause instanceof ApiError && cause.status === 404) {
          const freshId = crypto.randomUUID();
          sessionStorage.setItem(SESSION_KEY, freshId);
          setSessionId(freshId);
          setEntries([]);
          setDraft('');
          setSelected(null);
          setNotice('La sesión anterior ya no está disponible. Se inició una sesión nueva.');
        } else setError(`No se pudo recuperar la sesión: ${cause instanceof Error ? cause.message : 'Error desconocido'}`);
      }).finally(() => { if (active && sessionGeneration.current === generation) setRestoring(false); });
    }
    return () => { active = false; };
  }, []);
  useEffect(() => { const container = endRef.current?.closest('.conversation-scroll'); if (container) container.scrollTop = container.scrollHeight; }, [entries, busy]);

  const allCalls = useMemo(() => entries.flatMap(entry => entry.toolCalls ?? []), [entries]);
  const lastUsage = [...entries].reverse().find(entry => entry.usage)?.usage;
  const latestClassification = useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      const badges = getStructuredBadges(entries[i]?.toolCalls ?? [], Boolean(entries[i]?.needsConfirmation && !entries[i]?.resolved));
      if (badges.length) return badges;
    }
    return [];
  }, [entries]);
  const pendingIndex = entries.map((entry, index) => ({ entry, index })).reverse().find(({ entry }) => entry.needsConfirmation && entry.pendingConfirmation && !entry.resolved)?.index ?? -1;

  function selectMessage(id: string) {
    setSelected(id);
    setDraft(`Procesa ${id}. Extrae, valida y muéstrame la clasificación. No registres nada dudoso sin mi confirmación.`);
    setMobilePanel(null);
    inputRef.current?.focus();
  }
  function newSession() {
    sessionGeneration.current += 1;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    setSessionId(id); setEntries([]); setDraft(''); setSelected(null); setError(''); setNotice(''); setRestoring(false); setMobilePanel(null);
    inputRef.current?.focus();
  }
  async function submit(message: string, decision?: boolean) {
    const trimmed = message.trim();
    if (!trimmed || busy || restoring || !sessionId) return;
    if (IS_PREVIEW) { setError('Vista previa únicamente: no se envió ningún mensaje ni se registró ningún contrato. Configura VITE_API_BASE_URL para operar.'); return; }
    setError(''); setBusy(true);
    const userEntry: ChatEntry = { id: crypto.randomUUID(), role: 'user', text: trimmed };
    setEntries(current => [...current, userEntry]);
    if (decision === undefined) setDraft('');
    try {
      const response = await sendChat(sessionId, trimmed);
      if (decision !== undefined) setEntries(current => current.map((entry, i) => i === pendingIndex ? { ...entry, resolved: true } : entry));
      setEntries(current => [...current, responseEntry(response)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la solicitud.');
      if (decision === undefined) setDraft(trimmed);
    } finally { setBusy(false); inputRef.current?.focus(); }
  }

  const visibleEntries = entries.length ? entries : IS_PREVIEW ? [previewEntry] : [];
  return <div className="app-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark"><ShieldCheck className="h-5 w-5" strokeWidth={2.2} /></div><div className="brand-divider" /><div className="brand-copy"><div className="brand-title">Centro de Control Contractual</div><div className="brand-subtitle">Reto 02 · Registro de Contratos Vigentes</div></div></div><div className="topbar-actions"><BackendStatus health={health} preview={IS_PREVIEW} checking={checking} /><Button variant="outline" size="sm" className="new-session" onClick={newSession} disabled={busy}><Plus />Nueva sesión</Button></div></header>
    <div className="workspace-topline"><div className="flex min-w-0 items-center gap-2"><span className="workspace-label">OPERACIONES</span><ChevronRight className="h-3 w-3 text-muted-foreground" /><span className="text-foreground">Buzón contractual</span></div><span className="hidden text-muted-foreground sm:inline">PERIFERIA IT GROUP <span className="mx-2">/</span> CONSOLA DE ANÁLISIS</span></div>
    {IS_PREVIEW && <div className="preview-banner"><CircleHelp className="h-4 w-4 shrink-0" /><span><strong>Modo vista previa</strong> — Datos de ejemplo para validar la interfaz. Sin conexión al servicio; no se procesan ni registran contratos.</span></div>}
    <div className="mobile-switcher"><Button size="sm" variant={mobilePanel === 'inbox' ? 'default' : 'outline'} onClick={() => setMobilePanel(mobilePanel === 'inbox' ? null : 'inbox')}><Menu />Buzón</Button><Button size="sm" variant={mobilePanel === 'activity' ? 'default' : 'outline'} onClick={() => setMobilePanel(mobilePanel === 'activity' ? null : 'activity')}><ClipboardList />Actividad</Button><Button size="sm" variant="outline" onClick={newSession} disabled={busy}><Plus />Nueva sesión</Button></div>
    <main className="workspace-grid"><div className={`side-inbox ${mobilePanel === 'inbox' ? 'mobile-visible' : ''}`}><InboxSelector selected={selected} onSelect={selectMessage} onProcessAll={() => { setSelected(null); setDraft(ALL_PROMPT); setMobilePanel(null); inputRef.current?.focus(); }} /></div>
      <section className="conversation-panel"><div className="panel-heading conversation-heading"><div><div className="eyebrow">ESPACIO DE TRABAJO</div><h1 className="panel-title">Análisis contractual</h1></div><div className="flex items-center gap-2"><span className="live-pill"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{IS_PREVIEW ? 'VISTA PREVIA' : 'SESIÓN ACTIVA'}</span></div></div>
        <div className="conversation-scroll"><div className="conversation-content">{!visibleEntries.length && <div className="welcome-state"><div className="welcome-icon"><Command className="h-6 w-6" /></div><div className="eyebrow">ANÁLISIS ASISTIDO</div><h2>Tu bandeja, bajo control.</h2><p>Selecciona un caso del buzón o escribe una solicitud para comenzar.</p><div className="welcome-rule" /><div className="welcome-capabilities"><span>01 <b>Extraer</b></span><ArrowRight className="h-3 w-3" /><span>02 <b>Validar</b></span><ArrowRight className="h-3 w-3" /><span>03 <b>Revisar</b></span></div></div>}
          {restoring && <p className="py-3 text-center text-xs text-muted-foreground">Recuperando historial...</p>}
          {visibleEntries.map((entry, i) => <ChatMessage key={entry.id} entry={entry} isLatestReview={!IS_PREVIEW && i === pendingIndex} busy={busy} onDecision={approved => submit(approved ? 'confirmo' : 'no confirmo', approved)} />)}
          {busy && <div className="message message-agent"><div className="message-avatar agent-avatar"><Command className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="mb-1 text-xs font-semibold">Agente contractual</div><div className="analyzing"><span className="loading-bars"><i /><i /><i /></span>Analizando...</div></div></div>}
          <div ref={endRef} /></div></div>
         <div className="composer-area">{notice && <div role="status" className="session-notice"><span>{notice}</span><Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X className="h-3.5 w-3.5" /></Button></div>}{error && <div role="alert" className="error-banner"><span>{error}</span><Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Cerrar error" onClick={() => setError('')}><X className="h-3.5 w-3.5" /></Button></div>}<form className="composer" onSubmit={event => { event.preventDefault(); void submit(draft); }}><Textarea ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(draft); } }} placeholder="Escribe una instrucción para analizar contratos..." aria-label="Mensaje para el agente" rows={2} disabled={busy || restoring} /><div className="composer-bottom"><span>{IS_PREVIEW ? 'Vista previa · sin envío real' : 'Supervisión humana en datos dudosos'}</span><Button type="submit" size="sm" disabled={busy || restoring || !draft.trim()}><Send className="h-3.5 w-3.5" />Enviar</Button></div></form></div>
      </section>
      <aside className={`activity-panel ${mobilePanel === 'activity' ? 'mobile-visible' : ''}`}><div className="panel-heading"><div><div className="eyebrow">TRAZABILIDAD</div><h2 className="panel-title"><ClipboardList className="h-4 w-4" /> Actividad</h2></div></div><div className="activity-scroll"><div className="activity-section"><div className="section-label">SESIÓN ACTUAL</div><div className="session-block"><span>Session ID</span><code title={sessionId}>{sessionId || 'Iniciando...'}</code></div></div><div className="activity-section"><div className="section-label">CLASIFICACIÓN MÁS RECIENTE</div><div className="flex flex-wrap gap-1.5">{latestClassification.length ? latestClassification.map(value => <ClassificationBadge key={value} value={value} />) : <span className="empty-inline">Aún sin clasificar</span>}</div></div><div className="activity-section"><div className="section-label">CONSUMO DE TOKENS <span className="normal-case tracking-normal">· última respuesta</span></div><TokenUsage usage={lastUsage as JsonRecord} /></div><div className="activity-section"><div className="section-label">FLUJO DE HERRAMIENTAS <span className="count-pill">{allCalls.length.toString().padStart(2, '0')}</span></div>{allCalls.length ? <div className="timeline">{allCalls.map((call, i) => <div className="timeline-item" key={i}><div className="timeline-dot" /><div className="min-w-0"><div className="text-xs font-semibold text-foreground">{TOOL_LABELS[call.name] ?? call.name}</div><div className="mt-0.5 break-words text-[11px] leading-relaxed text-muted-foreground">{call.summary || call.name}</div></div></div>)}</div> : <div className="empty-activity"><ClipboardList className="h-5 w-5" /><span>Las operaciones aparecerán aquí en tiempo real.</span></div>}</div><div className="activity-section alerts-section"><div className="section-label"><BellRing className="h-3.5 w-3.5" /> ALERTAS Y VENCIMIENTOS</div><AlertsSummary calls={allCalls} /></div></div></aside>
    </main><footer className="app-footer"><span>PERIFERIA IT GROUP <span className="mx-2 text-border">/</span> RETO TÉCNICO 02</span><span>Control contractual · Supervisión y trazabilidad</span></footer>
  </div>;
}