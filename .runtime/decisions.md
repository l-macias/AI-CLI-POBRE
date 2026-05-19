## 005 - Provider isolation

The runtime must not call OpenRouter directly. All model access goes through the Provider interface.

## 006 - No automatic provider call on startup

The development entrypoint initializes the provider layer but does not call the API automatically. This avoids failing local startup when no API key is configured.

## 007 - Native fetch

The project uses Node.js native fetch instead of adding an HTTP client dependency.

## 008 - Runtime state is persisted as markdown first

The first persistence layer uses human-readable markdown files before introducing JSON checkpoints or database-backed memory.

## decision-010 - Persist only accepted plans

Plans must only be persisted after passing the full runtime-controlled acceptance flow:

1. Provider response received.
2. Structured JSON parsed.
3. Zod schema validation passed.
4. Plan optimized.
5. PlanValidator passed.
6. Architecture path guardrails passed.
7. Runtime accepted the plan.

Rejected, malformed, non-canonical, or provider-failed plans must never be written to `.runtime/active-plan.json`.

## decision-011 - Retry policy is runtime-owned

Plan generation retry behavior is owned by the runtime, not by the model.

The runtime classifies failures before deciding whether to retry.

Recoverable failures include invalid JSON, invalid schema output, and empty provider responses.

Non-retryable failures include provider authentication errors, payment errors, forbidden access, missing models, and rate limits.

The model may only retry when the runtime explicitly allows another attempt.

## decision-012 - No fallback model yet

Automatic model fallback is intentionally deferred.

Session 11 implements retry/rejection policy, not model routing.

Fallback model selection may be added later, but it must remain runtime-controlled and deterministic.

## decision-013 - Valid plans are not executable by default

A generated plan that passes schema validation, runtime validation, and architecture validation receives status `validated`.

A `validated` plan is not automatically executable.

The runtime must explicitly approve the plan before it can become `ready_for_execution`.

Allowed lifecycle:

generated -> validated -> approved -> ready_for_execution

Rejected lifecycle:

generated -> rejected
validated -> rejected

Invalid transition confirmed:

validated -> ready_for_execution

## decision-014 - Validation pipeline exists before command execution

Validation contracts and orchestration must exist before tools or command execution are introduced.

Session 13 intentionally registers TypeScript, lint, and build validators without executing their commands.

This keeps validation runtime-owned and avoids introducing implicit tool execution.

Command execution may only be added later through an explicit runtime-controlled execution contract.

## decision-015 - Tools are intents before execution

Tools are not executable by default.

A model may only propose a tool intent.

The runtime must validate:

1. tool registration
2. request schema
3. tool input schema
4. permissions

before any future execution can happen.

Session 14 intentionally introduced contract-only placeholder tools and no filesystem implementation.

## decision-016 - Guardrails must exist before real tools

Real tools must not be implemented before the runtime has a dedicated guardrail layer.

All future tool execution must pass through runtime-owned guardrails before any file, command, network, or git action can occur.

Session 15 introduced:

- permission validation
- protected file blocking
- dangerous command blocking
- token limit protection
- context overflow protection

The model remains unable to execute tools directly.

## decision-017 - Read-only tools require full runtime guardrails

Read-only filesystem tools may execute only after passing:

1. ToolRegistry lookup
2. ToolExecutionValidator schema validation
3. ToolPermissionPolicy validation
4. ToolPermissionManager guardrails
5. Project root path resolution
6. Protected file blocking

Even read-only tools must not bypass runtime guardrails.

Protected paths remain blocked before execution.

## decision-018 - Writes require explicit runtime control

Filesystem writes are allowed only through runtime-owned write tools.

Write tools must pass:

1. ToolRegistry lookup
2. ToolExecutionValidator schema validation
3. ToolPermissionPolicy validation
4. ToolPermissionManager guardrails
5. Project root path resolution
6. Protected file blocking

Edits require `diffConfirmed: true`.

Edits must create a backup before writing.

Restore operations must create a pre-restore backup before replacing content.

Protected files remain blocked before execution.

Terminal commands and git operations remain unavailable.

## Session 18 — Runtime Tool Execution Gate + Plan Step Mapping

### Decision: execution requires ready_for_execution

Only plans with `activePlanReview.status === "ready_for_execution"` may execute tools.

Rejected statuses:

- `generated`
- `validated`
- `rejected`
- `approved`

Reason:
A valid or approved plan is not automatically executable. Execution requires an explicit runtime transition.

### Decision: model proposes, runtime executes

Plan steps may include `toolIntent`, but the model does not execute tools.

The runtime:

1. checks the active plan review status,
2. checks the step exists,
3. blocks forbidden step types,
4. maps the step to a `ToolExecutionRequest`,
5. validates the request,
6. checks permissions and guardrails,
7. executes through `ToolRuntimeExecutor`,
8. writes audit logs.

### Decision: no shell tools in Session 18

`run_command` steps are explicitly blocked.

Reason:
Shell execution belongs to a later controlled phase and must not be introduced accidentally.

### Decision: no automatic full-plan execution yet

Session 18 only supports executing one explicit step by id.

Reason:
Sequential execution, step state, retry, rollback, and history belong to Session 19.

### Decision: write tools remain self-protected

The runtime allows `read` and `write` permissions, but write tools still enforce their own contracts:

- `create_file` does not overwrite existing files.
- `edit_file` requires `diffConfirmed: true`.
- `edit_file` creates automatic backups.
- protected files remain blocked by guardrails.

## Session 19 — Execution Engine

### Decision: execution engine does not bypass runtime tool gate

`ExecutionEngine` executes through `RuntimeToolController`.

Reason:
Session 18 established the execution gate. Session 19 must orchestrate execution, not replace validation or permissions.

### Decision: step execution state is tracked separately

Step state is tracked with:

- pending
- running
- executed
- blocked
- failed
- skipped
- rolled_back

Reason:
Session 20+ needs runtime loop state and failure recovery.

### Decision: repeated executed steps are blocked

Already executed steps cannot be executed again by default.

Reason:
Execution must be deterministic and avoid duplicate writes.

### Decision: execution history is append-only

Execution events are written to `.runtime/execution-history.md`.

Reason:
Runtime decisions and tool executions must be auditable.

### Decision: rollback is only foundational for now

Session 19 detects rollback availability but does not orchestrate rollback yet.

Reason:
Failure recovery and rollback policies belong to later sessions.

## Session 20 — Runtime Loop v1

### Decision: runtime loop is single-run controlled

`RuntimeLoop.runOnce()` performs one controlled loop run.

Reason:
The first loop must be auditable and bounded. Infinite/autonomous loops are deferred.

### Decision: model may propose toolIntent

Plan steps may now include `toolIntent`.

Reason:
The runtime needs executable intent to map plan steps into `ToolExecutionRequest`, but the model still does not execute anything.

### Decision: runtime still owns execution

The runtime loop executes through:

- `ExecutionEngine`
- `RuntimeToolController`
- `RuntimeToolExecutionGate`
- `ToolExecutionValidator`
- `ToolPermissionManager`

Reason:
Session 20 must not bypass Sessions 18 and 19.

### Decision: runtime test artifacts are allowed in controlled roots

`ArchitecturePathGuard` allows controlled runtime test roots such as `.runtime/loop-tests/`.

Reason:
End-to-end loop tests need safe writable locations without opening all of `.runtime/`.

### Decision: no uncontrolled auto-execution

The loop can auto-approve only inside the explicit loop input.

Reason:
Approval and execution must remain explicit runtime choices.

## Session 21 — Failure Recovery + Replanner

### Decision: failure recovery is runtime-owned

Failures are classified by runtime code, not by model improvisation.

### Decision: no automatic retry yet

Retryable failures are identified, but automatic retry is deferred.

Reason:
Retries must be bounded, auditable, and policy-driven.

### Decision: no automatic replan execution

The replanner can prepare a suggested fallback objective, but it does not execute the replan automatically.

Reason:
A replan must go through normal runtime lifecycle:
objective -> plan -> validate -> approve -> ready -> execute.

### Decision: recursive recovery is blocked

`RecursiveFailureGuard` blocks excessive recovery depth.

Reason:
The runtime must not enter uncontrolled recovery recursion.

### Decision: repeated failure loops are detected

`LoopDetector` tracks failure signatures and blocks repeated occurrences.

Reason:
The runtime must not repeat the same failed action indefinitely.

### Decision: failure history is append-only

Failures are written to `.runtime/failure-history.md`.

Reason:
Runtime failures must be auditable.

## Session 22 — Context Compressor + Memory Compactor

### Decision: compressed context is preferred

RuntimeInitializer now prefers `.runtime/runtime-summary.md` and `.runtime/compressed-context.md` when available.

Reason:
Future runtime loops should avoid loading large raw memory files by default.

### Decision: compression is deterministic

Context compression uses local deterministic rules instead of model-generated summaries.

Reason:
Runtime memory compaction must be predictable, cheap, and safe.

### Decision: runtime-summary is critical context

`.runtime/runtime-summary.md` is loaded with critical priority.

Reason:
It provides a compact representation of current project state.

### Decision: compressed-context is secondary compact context

`.runtime/compressed-context.md` is loaded after runtime summary.

Reason:
It gives broader history only when token budget allows.

### Decision: retrieval comes after compression

Session 23 will add project-context retrieval.

Reason:
Compression reduces runtime memory; retrieval reduces project source context.

## Session 23 — Retrieval System v1

### Decision: retrieval is deterministic and local

The runtime indexes local project files, chunks content, scores relevance, and returns ranked chunks without network calls.

Reason:
Project context retrieval must be cheap, deterministic, and runtime-controlled.

### Decision: protected and irrelevant paths are ignored

The file indexer ignores dependency/build/protected paths such as:

- `node_modules`
- `.git`
- `dist`
- `build`
- `.next`
- `.env`

Reason:
Retrieval must not expose protected files or waste context on generated/dependency content.

### Decision: retrieval uses chunk-level scoring

Files are split into chunks and scored independently.

Reason:
Planning should receive only relevant parts of files, not entire files by default.

### Decision: import graph is basic but useful

The first import graph extracts local imports and resolves `.js` ESM imports back to TypeScript source files when possible.

Reason:
This creates the foundation for code intelligence and relationship-aware editing.

## Session 23.5 — Retrieval Integration into Runtime Context

### Decision: planning context includes retrieved project chunks

`AgentRuntime.generatePlan()` now enriches runtime memory with retrieved project context before calling `PlanGenerator`.

Reason:
The model should plan with relevant project files instead of relying only on memory summaries.

### Decision: examples are excluded from planning retrieval

`PlanningContextRetriever` excludes `src/examples/`.

Reason:
Planning should prioritize production/runtime files, not test/demo files.

### Decision: PlanGenerator remains unchanged

Retrieval context is appended to the existing `runtimeContext` string.

Reason:
This keeps the planning contract simple and avoids adding new provider/schema complexity.

```md
## Decisión — Code Intelligence antes de editar

Fecha: 2026-05-14

Decisión:
Antes de preparar ediciones estructuradas, el runtime debe poder construir contexto estructural del archivo objetivo.

Motivo:
El runtime debe saber qué archivo toca, quién lo importa, qué importa, qué símbolos expone y qué chunks relacionados existen antes de permitir una edición.

Implementado en:

- `CodeIntelligenceReport`
- `FileRelationshipMap`
- `RelatedFilesResolver`
- `CodeSymbolScanner`
- `TypeReferenceScanner`
- `ImportGraph` mejorado

Estado:
Aplicado.

---

## Decisión — ASTEditTool no escribe archivos

Fecha: 2026-05-14

Decisión:
`ASTEditTool` en v1 solo genera preview estructurado. No escribe archivos.

Motivo:
La escritura debe seguir controlada por `EditFileTool`, que exige `diffConfirmed: true` y backup automático.

Flujo correcto:
`ASTEditTool` → `StructuredEditPreview` → `DiffFileTool` → revisión/confirmación → `EditFileTool`

Estado:
Aplicado.

---

## Decisión — Validation Feedback no reintenta ni replanea automáticamente

Fecha: 2026-05-14

Decisión:
La capa `validation-feedback` solo analiza resultados de validación y genera contexto/decisión sugerida.

No debe:

- ejecutar comandos;
- corregir automáticamente;
- reintentar automáticamente;
- replanear automáticamente;
- modificar `FailureRecovery` todavía.

Motivo:
La recuperación automática debe integrarse de forma controlada después, respetando loop guard, failure recovery y runtime authority.

Estado:
Aplicado.

---

## Decisión — `.runtime/` queda fuera de ESLint

Fecha: 2026-05-14

Decisión:
`.runtime/**` debe quedar ignorado por ESLint.

Motivo:
`.runtime/` contiene estado interno, backups, checkpoints, logs y archivos temporales de tests. No forma parte del código fuente del producto.

Estado:
Aplicado.
```

## Decisión — CLI controlada sin comandos arbitrarios

Fecha: 2026-05-14

Decisión:
La CLI v1 solo expone capacidades internas del runtime.

Incluye:

- context
- validate
- validation-feedback
- code-intel

No incluye:

- shell tools
- git tools
- network tools
- `child_process`
- comandos arbitrarios

Estado:
Aplicado.

## Decisión — Bootstrap determinístico y confirmado

Fecha: 2026-05-14

Decisión:
El Project Bootstrapper debe operar con preview primero y escritura confirmada.

Reglas:

- No sobrescribir `.runtime` existente sin `confirmOverwrite`.
- No escribir sin `confirmCreate`.
- No leer `.env`.
- No tocar código del proyecto.
- No usar shell/git/network.

Estado:
Aplicado.

## Decisión — Modelos por rol con premium bloqueado por defecto

Fecha: 2026-05-14

Decisión:
La selección de modelos debe depender del rol de tarea y quedar auditada.

Roles:

- planner
- retriever
- coder
- reviewer
- repair

Reglas:

- Premium no se usa por defecto.
- `allowPremium` debe habilitar escalada.
- OpenRouter sigue siendo compatible.
- La selección queda registrada en audit log.

Estado:
Aplicado.

## Decisión — Budgets y precios hardcodeados solo para arquitectura inicial

Fecha: 2026-05-14

Decisión:
En SESIÓN 27.5 se aceptan modelos, precios y límites hardcodeados solo para validar arquitectura y tests.

Motivo:
Primero se necesitaba comprobar:

- token budget;
- cost budget;
- premium approval gate;
- escalation guard;
- free-model-first policy;
- usage ledger.

Aclaración:
`openai/gpt-5-premium` es ficticio y solo existe para probar bloqueo/aprobación premium.

Pendiente:
Mover configuración a archivos externos antes de uso real:

- `.runtime/runtime-config.json`
- `.runtime/model-budget.json`
- `.runtime/provider-rules.md`

Estado:
Aceptado temporalmente.

## Decisión — Provider runtime config externa

Fecha: 2026-05-14

Decisión:
La estrategia provider, budgets y pricing deben poder cargarse desde configuración externa.

Archivo objetivo:

- `.runtime/provider-runtime-config.json`

Reglas:

- Config inválida usa fallback seguro.
- Config inexistente usa fallback seguro.
- No leer `.env`.
- Premium no se habilita por defecto.
- Toda selección debe auditarse.

Estado:
Aplicado.

## Decisión — Git controlado sin reemplazar backups internos

Fecha: 2026-05-14

Decisión:
Git se integra como capa adicional de auditoría/reversión, no como reemplazo de `FileBackupManager`.

Reglas:

- Solo tools Git explícitas.
- No git libre.
- No commit automático sin confirmación.
- No push/pull/fetch.
- No network.
- Restore solo confirmado.

Estado:
Aplicado.

## Decisión — Sandbox policy antes de shell tools

Fecha: 2026-05-14

Decisión:
Antes de permitir ejecución de comandos, el runtime debe evaluar política sandbox.

Reglas:

- Solo comandos registrados.
- No shell libre.
- No git libre.
- No network no autorizado.
- Timeout y output limit obligatorios.
- cwd controlado.

Estado:
Aplicado.

## Decisión — Shell tools controladas por runtime

Fecha: 2026-05-15

Decisión:
Zero Runtime puede ejecutar comandos solo si están registrados, autorizados y aprobados por SandboxPolicy.

Reglas:

- No existe ejecución de comando arbitrario.
- No `shell: true`.
- No pipes.
- No redirecciones.
- No comandos peligrosos.
- No network.
- No git desde shell.
- Timeout obligatorio.
- Output limitado.
- CWD controlado.
- `executeConfirmed: true` obligatorio.

Implementación:

- `dry_run_command` solo evalúa.
- `npm_script` ejecuta scripts npm permitidos.
- `build_command` y `test_command` son wrappers específicos.
- En Windows, npm se ejecuta vía `node + npm-cli.js` para evitar `spawn EINVAL`.

Estado:
Aplicado.

---

# `.runtime/decisions.md`

```md
# Decisions

## Sesión 31 — Observability + Runtime Metrics

### Decisión: observability primero aislada

Se implementó primero una capa aislada antes de integrarla al runtime.

Motivo:

- evitar acoplamiento prematuro;
- validar sanitización de datos;
- permitir tests sin provider externo;
- mantener runtime-first.

### Decisión: RuntimeTracer opcional por inyección

Las integraciones aceptan `RuntimeTracer` opcional.

Motivo:

- no romper tests existentes;
- no hacer obligatoria la observabilidad en todos los contextos;
- facilitar migración gradual.

### Decisión: no persistir métricas todavía

Las métricas quedan en memoria.

Motivo:

- primero validar estructura y seguridad;
- evitar generar ruido en `.runtime`;
- postergar persistencia hasta que el formato sea estable.

### Decisión: tokens son métrica segura

`promptTokens`, `completionTokens`, `totalTokens` y equivalentes no deben redactarse.

Motivo:

- son parte central de la auditoría;
- no son secretos;
- permiten medir costo y uso real.

### Decisión: secretos siempre redactados antes de logs/reportes

Se agregó `SensitiveDataRedactor` y se conectó a `Logger`, `RuntimeTracer`, timeline, profiler, errors y decision logs.

Motivo:

- observability no debe convertirse en fuga de secretos.
```

---

# `.runtime/decisions.md`

```md
# Decisions

## Sesión 32 — End-to-End Benchmark Projects

### Decisión: benchmarks primero aislados

Se implementó infraestructura de benchmarks sin provider externo.

Motivo:

- validar medición antes de usar LLM real;
- evitar costos innecesarios;
- evitar red;
- mantener reproducibilidad;
- no tocar proyectos reales.

### Decisión: fixtures locales bajo `.runtime`

Los benchmarks crean fixtures controlados dentro de `.runtime`.

Motivo:

- no romper el repo real;
- permitir casos reproducibles;
- evitar efectos secundarios fuera del área controlada.

### Decisión: validation segura en modo diferido

Los benchmarks usan `ValidationOrchestrator`, pero los validators actuales siguen en modo `skipped`.

Motivo:

- la ejecución real de comandos debe seguir pasando por sandbox/shell tools;
- no habilitar ejecución libre;
- mantener seguridad hasta integrar validación ejecutable controlada.

### Decisión: reportes persistidos por writer dedicado

Se agregó `BenchmarkReportWriter` separado de `BenchmarkReporter`.

Motivo:

- separar generación de reporte y escritura;
- controlar rutas;
- bloquear overwrite accidental;
- sanitizar antes de persistir.

### Decisión: suite multi-caso sin LLM

La Fase B agregó escenarios simulados/controlados.

Motivo:

- medir estructura de benchmark;
- comparar categorías;
- probar métricas agregadas;
- preparar base para benchmarks reales posteriores.
```

---

# `.runtime/decisions.md`

````md
# Decisions

## Sesión 33 — Real Project Trial

### Decisión: no construir fixers hardcodeados

Se descartó el enfoque de crear lógica específica para arreglar errores puntuales de `TheArtist.tsx`.

Motivo:

- Zero Runtime debe servir para muchos lenguajes, errores y proyectos;
- un fixer por error puntual no escala;
- el runtime no debe “saber arreglar Betz”;
- la IA debe proponer y el runtime debe validar/orquestar.

### Decisión: separar validación real de reparación

La validación controlada queda en `real-project-trial`.

La reparación genérica queda en `repair`.

Motivo:

- detectar errores no es lo mismo que proponer cambios;
- la validación puede ejecutarse sin tocar archivos;
- la reparación necesita contexto, propuesta, safety validation, diff y aprobación.

### Decisión: validación controlada sin shell libre

El runtime puede ejecutar validaciones solo mediante comandos permitidos.

Permitido:

- npm scripts permitidos: build, typecheck, lint;
- TypeScript local directo si existe `node_modules/typescript/bin/tsc`.

No permitido:

- comandos destructivos;
- shell arbitrario;
- npm install automático;
- git commit/push automático.

### Decisión: usar TypeScript directo para evitar blockers de build

Si existe TypeScript local, el trial puede ejecutar:

```txt
node node_modules/typescript/bin/tsc --noEmit --pretty false
```
````

## Decision — Session 38: Repair proposal flow is parser/schema/policy controlled

**Date:** 2026-05-18  
**Status:** Accepted

### Context

The repair flow evolved from a static placeholder into a runtime-controlled provider pipeline. LLM-like outputs are treated as untrusted text and must pass through runtime parsing, schema validation, safety validation, policy checks, budget estimation, and fallback logic before any patch can be previewed or applied.

### Decision

Repair proposals must always flow through:

```txt
Provider output
  -> PatchProposalParser
  -> PatchProposalSchema
  -> RepairModelPolicy / RepairCostEstimator
  -> RepairProviderFallback when needed
  -> PatchSafetyValidator
  -> diff preview
```

````md
## Decision — Session 39: Agent loop must be approval-gated before writes

**Date:** 2026-05-18  
**Status:** Accepted

### Context

The project now supports an interactive agent loop that can inspect, validate, request repair proposals, show diff previews, request user approval, apply patches, revalidate, and report completion.

The key risk is uncontrolled autonomous writing.

### Decision

The agent loop may execute read-only and preview actions without write approval, but any patch application must require a persisted approval request with status `approved`.

The controlled lifecycle is:

```txt
objective
  -> inspect_project
  -> validate_project
  -> check_git
  -> request_repair_proposal
  -> show_diff_preview
  -> request_approval
  -> approve/reject
  -> apply_patch only if approved
  -> revalidate_project
  -> report_result
  -> completed
```
````

---

# 2. Agregar a `decisions.md`

````md
## Decision — Session 40: CLI agent command is the primary user-facing loop interface

**Date:** 2026-05-18  
**Status:** Accepted

### Context

Session 39 produced a working internal approval-gated agent loop. It could inspect, validate, request a repair proposal, show a diff preview, request approval, apply a patch, revalidate, and report completion.

However, without a CLI interface, the loop was only directly usable through tests/internal classes.

### Decision

Expose the agent loop through the CLI using the `zero agent` command namespace.

Supported actions:

```txt
start
status
actions
approvals
next
step
approve
reject
report
reset
```
````

## 008 - Runtime state is persisted as markdown first

The first persistence layer uses human-readable markdown files before introducing JSON checkpoints or database-backed memory.

## 008 - Runtime state is persisted as markdown first

The first persistence layer uses human-readable markdown files before introducing JSON checkpoints or database-backed memory.
