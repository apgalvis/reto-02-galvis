# SOLUCION — Reto 02 Registro de Contratos Vigentes

## 1. Problema en una frase

Administración no tiene un punto único ni un maestro actualizado de contratos vigentes, por lo que pierde visibilidad de vencimientos, pólizas y cambios contractuales cuando los documentos quedan dispersos en correos personales.

## 2. Arquitectura

```text
Frontend de chat
      ↓
API HTTP / sesiones
      ↓
AgentLoop
      ↓
LlmAdapter propio → OpenAI Responses API
      ↓
Tools Zod
      ├─ contratos_leer_buzon
      ├─ contratos_extraer
      ├─ contratos_validar
      ├─ contratos_registrar
      └─ contratos_alertas
      ↓
Dominio determinístico
      ↓
fixtures/ (solo lectura)  →  out/ (escritura)
                                └─ sharepoint/ simulado
```

Separación:

- comportamiento: `agent/prompt.md`;
- conocimiento: `src/knowledge/registro-contratos.md`;
- ejecución: `src/tools/contratos.ts`;
- reglas de negocio: `src/domain/`;
- proveedor LLM: `src/llm/`.

## 3. Ciclo del agente

El backend limita el número de iteraciones tool → modelo por turno y el consumo acumulado de tokens por sesión.

Cuando `contratos_validar` devuelve `requiere_revision` no vacío, el backend guarda el contrato pendiente en la sesión, termina el turno y solicita confirmación explícita. El siguiente mensaje humano puede confirmar o cancelar. La confirmación se valida en backend: el modelo no puede convertir por sí solo una inferencia de baja confianza en un registro autorizado.

Toda tool call se devuelve a la UI y queda registrada en `out/log.jsonl`.

## 4. Modelo

La aplicación usa un adaptador propio para OpenAI Responses API. El modelo se configura mediante `OPENAI_MODEL`; el despliegue previsto usa `gpt-6-astra`.

La arquitectura no depende del proveedor: reemplazar OpenAI requiere cambiar únicamente la implementación de `LlmAdapter`.

El costo depende de la longitud del contrato, el número de tool calls y el contexto acumulado. En la validación publicada se observaron, por ejemplo:

- `msg-006`: 1,391 tokens de entrada + 397 de salida = 1,788 totales.
- `msg-001`: 2,891 tokens de entrada + 538 de salida = 3,429 totales.

Con la tarifa estándar publicada para GPT-6 Astra al 2026-10-01 (USD 10 por millón de tokens de entrada y USD 50 por millón de salida), esos turnos equivalen aproximadamente a **USD 0.034** y **USD 0.056** respectivamente. Referencia: https://developers.openai.com/api/docs/models/gpt-6-astra

El sistema impone `MAX_AGENT_ITERATIONS`, `MAX_OUTPUT_TOKENS` y `MAX_SESSION_TOKENS` para evitar consumo abierto.

## 5. Estrategia de extracción y confianza

La extracción P0 es determinística y no depende del modelo.

### Partes e identificador

Se detecta el primer bloque `Entre ... NIT/RUC ...` y se normaliza el identificador tributario eliminando puntos y dígito de verificación cuando el documento lo separa con guion.

### Objeto

Se toma el texto de la cláusula `PRIMERA. OBJETO` hasta la siguiente cláusula, con límite de 200 caracteres para el maestro.

### Valor y moneda

El valor se busca exclusivamente dentro de la cláusula `SEGUNDA. VALOR`, evitando confundir cifras de garantías con el valor contractual. Un contrato por demanda produce `valor=0` y `valor_indeterminado=true`.

### Fechas y plazo

Fechas explícitas reciben alta confianza. Si el contrato solo indica un mes de firma y un plazo en meses, se aplica una convención determinística de fin de mes para la fecha inicial y se deriva la fecha fin; esa derivación queda con confianza inferior a 0.8 y exige revisión humana.

### Póliza

Se detectan cláusulas de garantías y tipos conocidos (`cumplimiento`, `responsabilidad_civil`). Una garantía condicionada a futuras órdenes de servicio no convierte automáticamente el contrato marco base en un contrato con póliza pendiente.

### Comercial

El remitente se cruza con `comerciales.json`. Un remitente desconocido genera advertencia, no bloqueo.

### Umbral

Todo campo crítico con confianza `< 0.8` entra en `requiere_revision`. Los campos ausentes son `null` con confianza 0; en un otrosí, los campos no mencionados no reemplazan el contrato base.

## 6. Propuesta de regla de gobierno

Esta sección es una **propuesta operativa**, no una regla presente en los fixtures.

### Canal único

Usar `contratos@periferia-ficticia.com` como único buzón de recepción. Administración es dueña operativa del maestro y debe existir al menos un responsable titular y un respaldo para evitar dependencia de una sola persona.

### Obligación del comercial

Dentro de **1 día hábil** posterior a la firma, el comercial envía:

- contrato firmado;
- otrosíes o adendas;
- actas de terminación cuando existan;
- anexos que modifiquen valor, plazo o garantías.

Formato sugerido de asunto:

```text
[CONTRATO] Cliente | ID contrato | NUEVO
[CONTRATO] Cliente | ID contrato | OTROSI
[CONTRATO] Cliente | ID contrato | TERMINACION
```

### Acuse automático

El agente responde en menos de **5 minutos** con:

- documento recibido;
- clasificación preliminar;
- ID identificado;
- si quedó registrado o requiere revisión;
- campos/documentos pendientes.

La confirmación automática no equivale a revisión jurídica.

### Excepciones y escalamiento

- documento sin firma: se marca excepción y vuelve al comercial;
- contrato sin valor por diseño: se permite `valor_indeterminado`, pero cualquier fecha derivada o dato ambiguo exige confirmación;
- cláusula imposible de interpretar operativamente: se escala al dueño de negocio y, si requiere interpretación jurídica, a asesoría externa;
- remitente desconocido: se registra la advertencia y se valida pertenencia al equipo comercial, sin bloquear por sí sola.

### Cierre del gap junio–agosto 2026

Campaña única de reconstrucción:

1. solicitar a cada comercial inventario de contratos, otrosíes y terminaciones firmados entre 2026-06-01 y 2026-08-31;
2. cruzarlo con facturación/CRM para detectar clientes facturados sin contrato en maestro;
3. cargar los documentos al buzón único;
4. procesarlos con el mismo agente;
5. cerrar diferencias con responsables y fecha compromiso;
6. dejar un acta de cierre del gap y no mantener un flujo paralelo.

### Indicador mensual

**Cobertura contractual del ingreso**:

```text
contratos asociados a clientes facturados y presentes en maestro
--------------------------------------------------------------- × 100
             clientes facturados que requieren contrato
```

Meta propuesta: `>= 98%` mensual, acompañada por número de pólizas pendientes fuera de SLA.

## 7. Decisiones y trade-offs

### Regex/heurísticas antes que extracción generativa

Elegido: extracción determinística para P0.  
Descartado: pedir al LLM que produzca directamente la fila del maestro.  
Motivo: valor, fechas y pólizas son campos de control; la salida debe ser reproducible y auditable.

### CSV + filesystem antes que base de datos

Elegido: copia del maestro y SharePoint local simulado.  
Descartado: Supabase/PostgreSQL.  
Motivo: el PRD explícitamente no requiere DB y agregarla aumenta superficie de fallo sin mejorar la evaluación del dominio.

### Merge semántico de otrosí

Elegido: conservar los campos del contrato base y modificar solo los presentes en el otrosí.  
Descartado: tratar el otrosí como un contrato completo.  
Motivo: los campos ausentes en un otrosí no significan que deban borrarse.

### Confirmación del backend

Elegido: el backend conserva el contrato pendiente y ejecuta el registro confirmado.  
Descartado: confiar en que el LLM envíe `confirmado=true`.  
Motivo: evita autoaprobación del modelo.

## 8. Supuestos

- Los adjuntos ya tienen texto extraído; no se implementa OCR P0.
- `msg-006` usa una convención de fin de agosto (`2026-08-31`) para materializar la fecha de firma cuando solo se informa el mes. La fecha fin derivada es `2027-08-31` y queda bajo revisión humana.
- En un contrato marco con póliza solo para futuras órdenes mayores a un umbral, el contrato base se registra sin póliza pendiente.
- El maestro de fixtures es inmutable.
- La fecha fija de la demo es `2026-09-03`.

## 9. Cobertura

| Historia / capacidad | Estado |
|---|---|
| Leer buzón pendiente | Hecho |
| Detectar adjunto contractual | Hecho |
| Extracción con confianza | Hecho |
| Nuevo / actualización / duplicado / rechazado | Hecho |
| Otrosí con merge e historial | Hecho |
| Revisión humana `<0.8` | Hecho |
| Remitente desconocido no bloqueante | Hecho |
| Maestro de salida inmutable respecto al fixture | Hecho |
| Archivo tipo SharePoint | Hecho |
| `historial.jsonl` | Hecho |
| `procesados.json` | Hecho |
| Alertas <=60 días | Hecho |
| Pólizas pendientes | Hecho |
| Gap desde corte | Hecho |
| Front con tool calls visibles | Hecho |
| Deploy público Railway + Lovable | Hecho |
| Persistencia runtime en Volume | Hecho |
| OCR | No hecho, P1 opcional |
| Exchange / SharePoint reales | Fuera de alcance |

Resultados esperados verificados por tests:

- `msg-001`: nuevo;
- `msg-002`: nuevo;
- `msg-003`: actualización de valor y fecha fin;
- `msg-004`: duplicado RN1;
- `msg-005`: rechazado;
- `msg-006`: nuevo con revisión en valor y fecha fin.

## 10. Uso de IA

Se utilizó ChatGPT para análisis del PRD, arquitectura, implementación, revisión de reglas, tests y coordinación del despliegue. Lovable se utilizó para construir y validar la UI conversacional publicada.

No se delegan al modelo las decisiones críticas de clasificación, confianza, escritura del maestro ni cálculo de alertas. Se descartó trasladar reglas del dominio al frontend o al prompt porque reduciría auditabilidad.

## 11. Riesgos productivos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| PDF escaneado | OCR + score de calidad + revisión humana |
| Falso duplicado | priorizar ID y NIT; similitud de objeto solo como fallback |
| Fecha/valor inferido incorrectamente | confianza por campo + confirmación explícita |
| Otrosí parcial | merge con contrato base y diff auditable |
| Correo no enviado por comercial | regla de gobierno + conciliación mensual con facturación |
| Póliza vencida | alertas recurrentes y SLA con responsable |
| LLM autoaprueba | gate de confirmación en backend |
| Maestro corrupto | fixture read-only, escritura atómica en copia de salida |
| Reinicio del runtime | volumen persistente; en producción, DB/objeto duradero |
| Sesión en memoria | Redis/DB en producción |
| Costos del modelo | límites por iteración/sesión + medición de tokens |

## 12. Validación final publicada

URLs:

- Frontend: https://reto-02-galvis.lovable.app
- Health: https://reto-02-galvis-production.up.railway.app/api/health

Validación E2E:

- `msg-006` → **Nuevo + Requiere revisión** en `valor` y `fecha_fin`; tarjeta HITL correcta, sin confirmar ni registrar.
- Tool calls visibles: `contratos_extraer` y `contratos_validar` con argumentos y resultado completo.
- Tokens y sessionId visibles.
- Cero errores de consola.
- `msg-001` fue registrado en una prueba anterior; al reprocesarlo posteriormente se clasificó correctamente como duplicado, validando idempotencia.
- El frontend publicado también está versionado dentro de `frontend/`.
