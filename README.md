# Reto 02 — Agente conversacional “Registro de Contratos Vigentes”

Implementación TypeScript del reto técnico de Periferia IT Group.

## Enlaces

- **Aplicación pública:** https://reto-02-galvis.lovable.app
- **Backend / Health:** https://reto-02-galvis-production.up.railway.app/api/health
- **Repositorio:** https://github.com/apgalvis/reto-02-galvis

## Estado

- Motor determinístico de extracción ✅
- Clasificación nuevo / actualización / duplicado / rechazado ✅
- Confianza por campo + revisión humana ✅
- Maestro CSV de salida + archivo tipo SharePoint ✅
- Historial de cambios ✅
- Alertas de vencimiento y pólizas ✅
- `demo.ts` sin LLM/API key ✅
- 10/10 tests de dominio ✅
- AgentLoop + OpenAI Responses API adapter ✅
- API HTTP + sesiones ✅
- Módulo reutilizable ✅
- Front público en Lovable ✅
- Backend público en Railway ✅
- Persistencia mediante Railway Volume ✅
- E2E publicado validado ✅
- Frontend versionado en `frontend/` ✅

## Principio de arquitectura

> **El modelo interpreta y orquesta; las reglas de negocio deciden.**

El LLM nunca escribe directamente el maestro. Toda extracción, clasificación y persistencia pasa por herramientas tipadas y reglas determinísticas.

## Demo determinística

```bash
npm install
npm run demo
```

La demo limpia `out/`, procesa los seis mensajes en orden y usa `2026-09-03` como fecha fija. `msg-006` falla en la primera escritura por revisión pendiente y se registra en una segunda llamada con `confirmado: true`.

## Tests

```bash
npm test
npm run typecheck
npm run build
```

## API local

1. Copia `.env.example` a `.env`.
2. Define `OPENAI_API_KEY` únicamente en backend.
3. Ejecuta:

```bash
npm install
npm run dev
```

Endpoints:

```text
GET  /api/health
POST /api/chat
GET  /api/sessions/:id
```

Ejemplo:

```json
{
  "sessionId": "demo-001",
  "message": "Procesa el buzón de contratos con fecha de hoy 2026-09-03. No registres nada dudoso sin preguntarme."
}
```

## Casos esperados

| Mensaje | Resultado |
|---|---|
| `msg-001` | Nuevo, póliza pendiente |
| `msg-002` | Nuevo, sin póliza |
| `msg-003` | Actualización de `CT-2026-011`, conserva historial |
| `msg-004` | Duplicado RN1, sin reescritura |
| `msg-005` | Rechazado: cotización, no contrato |
| `msg-006` | Nuevo; revisión humana en `valor` y `fecha_fin`; remitente desconocido no bloquea |

## Outputs

```text
out/
├── log.jsonl
├── procesados.json
├── alertas.md
└── sharepoint/
    ├── maestro-contratos.csv
    ├── historial.jsonl
    └── Contratos/<año>/<cliente>/<id>.<ext>
```

El fixture `fixtures/reto-02/maestro-contratos.csv` nunca se modifica.

## Documentación

Ver `SOLUCION.md` para arquitectura, ciclo del agente, extracción/confianza, regla de gobierno, trade-offs y riesgos productivos.

## Validación E2E publicada

- `msg-006`: clasificado como **Nuevo + Requiere revisión**, con los campos `valor` y `fecha_fin` visibles en la tarjeta de revisión humana; no se confirmó ni registró durante la validación final.
- La UI mostró tool calls, tokens y sessionId sin errores de consola.
- En una prueba previa, `msg-001` quedó registrado; por idempotencia, una ejecución posterior lo clasificó correctamente como duplicado.

## Frontend versionado

El código fuente de la UI publicada en Lovable está incluido en `frontend/` para que la entrega sea autocontenida.
