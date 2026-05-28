Roadmap completo de Zero Runtime

SESIÓN 1 — Foundation Setup
Objetivo:

- Crear la base limpia y profesional del proyecto.

Implementado:

- package.json
- tsconfig strict
- ESLint
- Prettier
- env handling con Zod
- Logger estructurado
- shared types
- utils base
- estructura inicial de carpetas
- .runtime inicial

Archivos principales:

- package.json
- tsconfig.json
- eslint.config.js
- prettier.config.js
- .env.example
- src/config/env.ts
- src/observability/Logger.ts
- src/types/SharedTypes.ts
- src/types/RuntimeTypes.ts
- src/types/ProviderTypes.ts
- src/utils/safeJson.ts
- src/utils/errors.ts
- src/utils/paths.ts
- src/index.ts
- .runtime/current-state.md
- .runtime/active-module.md
- .runtime/decisions.md
- .runtime/next-steps.md
- .runtime/progress-log.md
- .runtime/handoff.md

Resultado:

- Proyecto TypeScript/Node.js limpio.
- ESM configurado.
- TypeScript strict funcionando.
- Lint funcionando.
- Dev script funcionando.
- Base lista para Provider Layer.

SESIÓN 2 — Provider Layer
Objetivo:

- Separar el runtime de cualquier proveedor/modelo específico.
- Crear una abstracción profesional para OpenRouter y futuros providers.

Implementado:

- Provider interface
- ProviderManager
- OpenRouterProvider
- ProviderFallback
- PromptBuilder
- StructuredOutputParser
- JsonRepair
- TokenEstimator
- ResponseSanitizer
- ModelSelector

Archivos principales:

- src/providers/Provider.ts
- src/providers/OpenRouterProvider.ts
- src/providers/ProviderManager.ts
- src/providers/ProviderFallback.ts
- src/providers/PromptBuilder.ts
- src/providers/StructuredOutputParser.ts
- src/providers/JsonRepair.ts
- src/providers/TokenEstimator.ts
- src/providers/ResponseSanitizer.ts
- src/providers/ModelSelector.ts
- src/types/ProviderTypes.ts

Resultado:

- El runtime no llama a OpenRouter directamente.
- Todo acceso al modelo pasa por ProviderManager.
- OpenRouterProvider queda aislado detrás de Provider interface.
- Preparado para agregar OpenAI, Anthropic, Ollama, Groq u otros providers.

SESIÓN 2.1 — Provider Smoke Test
Objetivo:

- Probar OpenRouter de forma aislada sin hacer que npm run dev dependa de una API key.
- Validar conexión real con un modelo.

Implementado:

- Script provider:test
- src/examples/provider-smoke-test.ts
- prueba con OPENROUTER_API_KEY
- request mínimo a OpenRouter
- parseo de respuesta JSON
- logging de usage

Archivos principales:

- src/examples/provider-smoke-test.ts
- package.json
- .env

Resultado:

- OpenRouter conectado.
- Modelo free probado.
- Respuesta JSON recibida.
- Usage metadata recibido.
- Se confirmó que algunos modelos free pueden romper JSON o gastar más tokens de lo esperado.

SESIÓN 3 — Structured Output Hardening + Token Reduction
Objetivo:

- Hacer más robusta la salida estructurada.
- Reducir consumo de tokens.
- Validar respuestas del modelo con Zod.

Implementado:

- JsonRepair mejorado
- StructuredOutputParser con parseWithSchema()
- ProviderManager.completeJson()
- ProviderJsonResponse
- ProviderReasoningOptions
- soporte inicial para reasoning config
- ModelCapabilitiesRegistry
- prompts más compactos
- maxTokens más agresivo en smoke test

Archivos principales:

- src/providers/JsonRepair.ts
- src/providers/StructuredOutputParser.ts
- src/providers/ProviderManager.ts
- src/providers/ModelCapabilities.ts
- src/providers/ModelSelector.ts
- src/types/ProviderTypes.ts
- src/examples/provider-smoke-test.ts

Resultado:

- provider:test valida salida con Zod.
- Se bajó el consumo aproximado de 406 tokens a 110 tokens.
- Se descubrió que algunos modelos rechazan reasoning: none.
- Se agregó capabilities por modelo para no enviar parámetros incompatibles.
- Modelo openai/gpt-oss-120b:free funcionó en smoke test, pero requiere cuidado con reasoning/token control.

SESIÓN 4 — Runtime State + Session Persistence
Objetivo:

- Implementar el diferencial central: estado operativo local en .runtime.
- Hacer que el runtime escriba contexto recuperable en archivos markdown.

Implementado:

- OperationalStateManager
- SessionPersistence
- CurrentStateGenerator
- ProgressTracker
- DecisionTracker
- HandoffGenerator
- escritura de current-state.md
- escritura de active-module.md
- escritura de decisions.md
- escritura de next-steps.md
- escritura de progress-log.md
- escritura de handoff.md
- script session:test

Archivos principales:

- src/session/OperationalStateManager.ts
- src/session/SessionPersistence.ts
- src/session/CurrentStateGenerator.ts
- src/session/ProgressTracker.ts
- src/session/DecisionTracker.ts
- src/session/HandoffGenerator.ts
- src/types/SessionTypes.ts
- src/examples/session-state-test.ts
- .runtime/current-state.md
- .runtime/active-module.md
- .runtime/decisions.md
- .runtime/next-steps.md
- .runtime/progress-log.md
- .runtime/handoff.md

Resultado:

- El runtime puede escribir su propio estado operativo.
- Los archivos .runtime quedan legibles para humanos y reutilizables por futuras sesiones/modelos.
- session:test funcionando.

SESIÓN 5 — Session Restore + Checkpoints
Objetivo:

- Leer el estado local existente.
- Crear checkpoints JSON recuperables.
- Preparar restauración entre sesiones.

Implementado:

- SessionRestorer
- SessionCheckpoint
- SessionSerializer
- ContextSnapshotter
- RuntimeCheckpoint types
- RestoredSessionContext
- checkpoints en .runtime/checkpoints/
- script session:restore

Archivos principales:

- src/session/SessionRestorer.ts
- src/session/SessionCheckpoint.ts
- src/session/SessionSerializer.ts
- src/session/ContextSnapshotter.ts
- src/types/CheckpointTypes.ts
- src/examples/restore-session.ts
- .runtime/checkpoints/checkpoint-\*.json

Resultado:

- El runtime puede restaurar contexto desde .runtime/\*.md.
- El runtime puede generar checkpoints JSON.
- Se confirmó que los \n dentro del JSON son normales porque representan saltos de línea escapados.
- session:restore funcionando.

SESIÓN 6 — Runtime Context Loader
Objetivo:

- Cargar contexto mínimo desde .runtime.
- Ensamblar contexto compacto para el modelo.
- Evitar enviar todo el proyecto al modelo.

Implementado:

- RuntimeContext
- RuntimeContextSource
- ContextAssembler
- RuntimeInitializer
- token estimate con TokenEstimator
- prioridad de fuentes:
  - critical
  - high
  - medium
  - low
- script runtime:context

Archivos principales:

- src/core/ContextAssembler.ts
- src/core/RuntimeInitializer.ts
- src/types/ContextTypes.ts
- src/examples/runtime-context-test.ts

Resultado:

- runtime:context funcionando.
- Se cargaron fuentes desde:
  - .runtime/current-state.md
  - .runtime/handoff.md
  - .runtime/next-steps.md
  - .runtime/active-module.md
  - .runtime/decisions.md
  - .runtime/progress-log.md
- Token estimate inicial aproximado: 726 tokens.
- Luego subió entre 1000 y 1350 tokens al crecer progress-log.
- El enfoque de contexto local resultó viable y barato.

SESIÓN 7 — Runtime Config + AgentRuntime Inicial
Objetivo:

- Dejar de tener solo scripts aislados.
- Crear un núcleo inicial del runtime.
- Inicializar config, provider, contexto y estado.

Implementado:

- AgentPhase
- RuntimeConfig
- RuntimeConfigFactory
- RuntimeState
- AgentRuntime
- AgentRuntime.initialize()
- RuntimeState snapshot
- provider registration dentro del runtime
- carga de contexto local dentro del runtime
- progress-log update al inicializar
- script runtime:test

Archivos principales:

- src/core/AgentPhase.ts
- src/core/RuntimeConfig.ts
- src/core/RuntimeState.ts
- src/core/AgentRuntime.ts
- src/core/RuntimeInitializer.ts
- src/examples/agent-runtime-test.ts

Resultado:

- AgentRuntime inicializa correctamente.
- RuntimeConfig se carga desde env.
- ProviderManager registra OpenRouter.
- RuntimeInitializer carga contexto local.
- RuntimeState pasa a phase ready.
- runtime:test funcionando.
- Último modelo activo probado en esta etapa:
  - openai/gpt-oss-120b:free

SESIÓN 8 — Runtime Objective Intake
Objetivo:

- Hacer que el runtime acepte objetivos.
- Validar y normalizar objetivo antes de cualquier llamada al modelo.
- Persistir objetivo en .runtime.
- Cambiar fase a planning.

Implementado:

- ObjectiveTypes
- ObjectiveAnalyzer
- RuntimeObjectiveInput
- RuntimeObjective
- objective validation
- objective normalization
- RuntimeState.activeObjective
- RuntimeState.setObjective()
- AgentRuntime.acceptObjective()
- actualización de current-state.md
- actualización de active-module.md
- append progress-log
- script runtime:objective

Archivos principales:

- src/types/ObjectiveTypes.ts
- src/core/ObjectiveAnalyzer.ts
- src/core/RuntimeState.ts
- src/core/AgentRuntime.ts
- src/examples/objective-intake-test.ts

Resultado:

- El objetivo entra primero al runtime.
- El runtime valida.
- El runtime normaliza.
- El runtime persiste.
- El runtime cambia a phase planning.
- El modelo todavía no decide nada.
- runtime:objective funcionando.

SESIÓN 9 — Plan Contract + Plan Validator
Objetivo:

- Permitir que el modelo proponga un plan, pero no ejecutarlo.
- Validar el plan con Zod y reglas runtime-owned.
- Rechazar planes inválidos, peligrosos o fuera de contrato.

Implementado:

- PlanningTypes
- PlanSchemas
- PlanValidator
- PlanOptimizer
- GoalTracker
- PlanGenerator
- AgentRuntime.generatePlan()
- retry controlado básico dentro de PlanGenerator
- script runtime:plan

Archivos principales:

- src/types/PlanningTypes.ts
- src/planning/PlanSchemas.ts
- src/planning/PlanValidator.ts
- src/planning/PlanOptimizer.ts
- src/planning/GoalTracker.ts
- src/planning/PlanGenerator.ts
- src/core/AgentRuntime.ts
- src/examples/plan-generation-test.ts

Reglas implementadas:

- Plan debe tener steps.
- Plan no puede superar límite de steps.
- Step IDs no pueden repetirse.
- run_command debe tener command.
- steps que no son run_command no pueden tener command.
- comandos peligrosos se bloquean.
- targets protegidos se bloquean.
- run_command requiere requiresApproval=true.
- edit_file/create_file requieren target.
- Zod valida shape del JSON.
- PlanSchemas usa strict() para evitar extra keys.
- PlanOptimizer ordena steps.
- GoalTracker resume cantidad de steps, commandSteps, validationSteps y approvalRequiredSteps.

Resultado:

- runtime:plan funciona.
- Con openai/gpt-oss-120b:free:
  - generó plan
  - pero tardó más de 5 minutos
  - a veces devolvió JSON corrupto
- Con minimax/minimax-m2.5:free:
  - respondió rápido
  - pero falló con OPENROUTER_EMPTY_RESPONSE
- Con google/gemma-4-31b-it:free:
  - funcionó bien
  - tardó aproximadamente 10 segundos
  - devolvió JSON válido
  - pasó Zod
  - pasó PlanValidator
  - Runtime plan accepted
- Recomendación actual:
  OPENROUTER_DEFAULT_MODEL=google/gemma-4-31b-it:free

Problema pendiente detectado:

- El plan aceptado por Gemma fue válido técnicamente, pero propuso rutas no ideales:
  - src/planning/types.ts
  - src/planning/validator.ts
- Arquitectura canonical esperada:
  - src/types/PlanningTypes.ts
  - src/planning/PlanValidator.ts

Conclusión:

- El modelo ya puede proponer planes.
- El runtime ya puede validarlos y aceptarlos.
- Falta endurecer validación arquitectónica y persistencia de planes.

SESIÓN 10 — Plan Persistence + Architecture Path Guardrails
Objetivo:

- Persistir planes validados.
- Agregar guardrails arquitectónicos.

Implementar:

- .runtime/active-plan.json
- .runtime/plan-history.md
- PlanPersistence
- ArchitecturePathGuard o reglas dentro de PlanValidator
- Validar rutas canonical del proyecto

Resultado:

- El modelo propone planes.
- El runtime valida forma, seguridad y arquitectura.
- Solo planes aceptados se persisten.

SESIÓN 11 — Plan Rejection + Retry Policy
Objetivo:

- Hacer robusta la generación de planes.

Implementar:

- PlanGenerationRetryPolicy
- PlanGenerationAttempt
- errores detallados por intento
- prompts correctivos mínimos
- límite de reintentos
- registro en progress-log

Resultado:

- Si el modelo devuelve JSON inválido, el runtime reintenta.
- Si vuelve a fallar, rechaza.
- Nada corrupto entra al sistema.

SESIÓN 12 — Plan Review State Machine
Objetivo:

- Formalizar estados del plan antes de ejecutar.

Implementar:

- plan status: generated, validated, rejected, approved, ready_for_execution
- RuntimeState extendido
- Plan approval gate
- Plan metadata

Resultado:

- Un plan válido no se ejecuta automáticamente.
- Primero queda aprobado por runtime.
- Luego podrá entrar a ejecución.

SESIÓN 13 — Validation Pipeline Base
Objetivo:

- Crear pipeline de validación antes de tools.

Implementar:

- ValidationOrchestrator
- TypeScriptValidator
- LintValidator
- BuildValidator
- ValidationReporter

Resultado:

- El runtime sabe correr validaciones.
- Todavía sin editar archivos automáticamente.

SESIÓN 14 — Tool Contract Base
Objetivo:

- Definir contrato de tools sin implementar filesystem aún.

Implementar:

- Tool interface
- ToolRegistry
- ToolResult
- ToolPermission
- ToolExecutionRequest
- ToolExecutionResult
- Tool schema con Zod

Resultado:

- El modelo nunca ejecuta tools.
- Solo puede proponer tool intents.
- El runtime valida permisos y schema.

SESIÓN 15 — Tool Permission Manager + Safeguards
Objetivo:

- Crear la capa de seguridad antes de ejecutar tools reales.

Implementar:

- ToolPermissionManager
- ProtectedFilesGuard
- DangerousCommandGuard
- PermissionGuard
- TokenLimitGuard
- ContextOverflowGuard

Resultado:

- Nada toca archivos, terminal o git sin pasar por guardrails.

SESIÓN 16 — Filesystem Tools Read-Only
Objetivo:

- Implementar solo tools de lectura.

Implementar:

- ReadFileTool
- ListDirectoryTool
- SearchFilesTool
- DiffFileTool

Resultado:

- El runtime puede inspeccionar el proyecto.
- Todavía no puede modificar archivos.

SESIÓN 17 — Filesystem Tools Write-Controlled
Objetivo:

- Implementar escritura con validación estricta.

Implementar:

- CreateFileTool
- EditFileTool
- BackupFileTool
- RestoreCheckpointTool

Reglas:

- backup antes de editar
- path guard
- protected files blocked
- diff obligatorio
- validación posterior

Resultado:

- El runtime puede modificar archivos de forma controlada.
  SESIÓN 18 — Terminal Tools Safe Execution
  Objetivo:

- Permitir comandos seguros.

Implementar:

- RunCommandTool
- RunTypecheckTool
- RunLintTool
- RunBuildTool
- RunTestsTool
- TerminalSanitizer
- ProcessMonitor

Resultado:

- El runtime puede ejecutar comandos permitidos.
- Comandos peligrosos se bloquean.

SESIÓN 19 — Execution Engine
Objetivo:

- Ejecutar planes paso por paso.

Implementar:

- ExecutionEngine
- TaskQueue
- ToolExecutor
- step state
- rollback básico
- execution-history.md

Resultado:

- El runtime toma un plan validado y ejecuta pasos controlados.

SESIÓN 20 — Runtime Loop v1
Objetivo:

- Crear loop inicial del agente.

Flujo:

1. aceptar objetivo
2. cargar contexto
3. generar plan
4. validar plan
5. persistir plan
6. aprobar plan
7. ejecutar paso
8. validar resultado
9. actualizar estado
10. repetir

Resultado:

- Primer agente funcional end-to-end.

SESIÓN 21 — Failure Recovery + Replanner
Objetivo:

- Manejar errores sin perder control.

Implementar:

- FailureRecovery
- Replanner
- RecursiveFailureGuard
- LoopDetector
- retry por paso
- fallback de plan

Resultado:

- Si algo falla, el runtime no improvisa.
- Recupera, registra y decide.

SESIÓN 22 — Context Compressor + Memory Compactor
Objetivo:

- Reducir tokens automáticamente.

Implementar:

- ContextCompressor
- MemoryCompactor
- SummaryMemory
- compressed-context.md
- runtime-summary.md

Resultado:

- El runtime mantiene contexto barato y útil.

SESIÓN 23 — Retrieval System v1
Objetivo:

- Buscar contexto relevante del proyecto.

Implementar:

- FileIndexer
- Chunker
- RelevanceScorer
- ContextRetriever
- ImportGraph básico
- RetrievalCache

Resultado:

- El runtime no manda todo el proyecto al modelo.
- Recupera solo archivos relevantes.

SESIÓN 23.5 — Retrieval Integration into Runtime Context
Conecta retrieval con AgentRuntime / PlanGenerator

# SESIÓN 24 — Code Intelligence Layer

## Objetivo

Mejorar edición de código con estructura y relaciones antes de editar.

## Implementar recomendado

- `FileRelationshipMap`
- `ImportGraph` mejorado
- `RelatedFilesResolver`
- `CodeSymbolScanner` básico
- `TypeReferenceScanner` básico
- `CodeIntelligenceReport`
- base para `ASTEditTool` posterior

## Resultado esperado

Antes de tocar un archivo, el runtime debe saber:

- quién importa el archivo;
- qué importa el archivo;
- qué archivos están relacionados;
- qué chunks relevantes recupera retrieval;
- símbolos exportados/importados básicos;
- referencias textuales útiles.

## Reglas

- No editar archivos todavía salvo los de la sesión.
- No avanzar a AST-Safe Editing completa.
- No shell tools.
- No git tools.
- No network tools.
- No usar `any`.
- Mantener `exactOptionalPropertyTypes`.
- ESM imports con `.js`.
- Test obligatorio al final.

---

# SESIÓN 24.5 — AST-Safe Editing v1

## Objetivo

Crear la primera base de edición estructural segura.

La idea no es que el modelo escriba archivos completos libremente, sino que proponga una intención y el runtime prepare una edición más controlada.

## Implementar recomendado

- `ASTEditTool` base
- `StructuredEditIntent`
- `SafeReplacementPlanner`
- `FunctionBoundaryDetector`
- `ImportEditorTool`
- `ExportEditorTool`
- `StructuredEditPreview`
- validación de target antes de editar
- integración inicial con `DiffFileTool`

## Resultado esperado

El runtime debe poder preparar ediciones estructuradas como:

- agregar import;
- quitar import;
- reemplazar bloque dentro de función/clase;
- detectar límites básicos de función;
- generar preview antes de escribir;
- rechazar ediciones ambiguas.

## Reglas

- No escribir directo sin preview/diff.
- No bypass de `EditFileTool`.
- `diffConfirmed: true` sigue siendo obligatorio.
- Backup automático sigue siendo obligatorio.
- No shell tools.
- No git tools.
- No network tools.
- No usar `any`.
- Test obligatorio al final.

---

# SESIÓN 24.75 — Validation Feedback Loop

## Objetivo

Convertir errores de validación en feedback estructurado para el runtime.

Cuando TypeScript, lint o build fallen, el runtime debe analizar el error y transformarlo en contexto útil para un nuevo plan controlado.

## Implementar recomendado

- `ValidationResultAnalyzer`
- `TypeErrorAnalyzerTool`
- `LintErrorAnalyzerTool`
- `ValidationFeedbackMapper`
- `FixCandidateGenerator`
- `ValidationFailureContext`
- integración con `FailureRecovery`
- integración futura con `Replanner`

## Resultado esperado

Si aparece un error de TypeScript/lint/build, el runtime debe poder responder:

- qué archivo falló;
- en qué línea aproximada;
- qué tipo de error es;
- qué símbolo o import parece involucrado;
- qué archivos relacionados conviene recuperar;
- si requiere retry, replan o bloqueo.

## Reglas

- No ejecutar comandos todavía fuera de validadores existentes.
- Si los validadores siguen en modo `skipped`, analizar solamente resultados disponibles/manuales.
- No shell tools libres.
- No git tools.
- No network tools.
- No usar `any`.
- Test obligatorio al final.

---

# SESIÓN 25 — CLI v1

## Objetivo

Hacer que Zero Runtime sea usable desde terminal como producto local.

## Implementar recomendado

- CLI entrypoint
- `zero-runtime init`
- `zero-runtime status`
- `zero-runtime objective`
- `zero-runtime plan`
- `zero-runtime approve`
- `zero-runtime ready`
- `zero-runtime run-step`
- `zero-runtime loop`
- `zero-runtime memory compact`
- `zero-runtime retrieve`
- salida clara en consola
- códigos de salida correctos

## Resultado esperado

El usuario debe poder usar Zero Runtime sin tocar scripts internos de `src/examples`.

Flujo mínimo:

```bash
zero-runtime init
zero-runtime objective "..."
zero-runtime plan
zero-runtime approve
zero-runtime ready
zero-runtime run-step step-001
zero-runtime status
```

Reglas
CLI solo orquesta APIs existentes.
CLI no debe saltarse gates.
CLI no debe ejecutar shell arbitrario.
CLI no debe modificar estado sin pasar por runtime.
No git tools todavía.
No network tools extra.
Test obligatorio al final.

SESIÓN 26 — Project Bootstrapper
Objetivo

Permitir que Zero Runtime se inicialice en cualquier repo real.

Implementar recomendado
.runtime bootstrap
bootstrap.md
runtime-rules.md
provider-rules.md
coding-conventions.md
security-policy.md
project-profile.md
runtime-config.json
detección básica de stack
plantilla inicial de memoria
Resultado esperado

En un proyecto nuevo, Zero Runtime debe poder crear una estructura inicial:

.runtime/
├── current-state.md
├── active-module.md
├── decisions.md
├── next-steps.md
├── progress-log.md
├── handoff.md
├── runtime-rules.md
├── provider-rules.md
├── coding-conventions.md
├── security-policy.md
├── project-profile.md
└── runtime-config.json
Reglas
No sobrescribir .runtime existente sin confirmación.
No leer .env.
No tocar código del proyecto durante bootstrap.
Bootstrap debe ser determinístico.
No shell tools.
No git tools.
Test obligatorio al final.

SESIÓN 27 — Provider Strategy v1
Objetivo

Preparar soporte multi-provider serio y separar modelos por rol.

Zero Runtime debe poder usar modelos gratis/baratos para tareas simples y modelos premium solo cuando el runtime lo justifique.

Implementar recomendado
provider roles
plannerModel
retrieverModel
coderModel
reviewerModel
repairModel
fallback chain
model capabilities extendido
provider policy
risk-based model selection
costo estimado por ejecución
Resultado esperado

El runtime debe poder decidir:

qué modelo usa para planning;
qué modelo usa para revisar;
qué modelo usa para reparar JSON;
qué modelo usa para tareas baratas;
cuándo escalar a premium;
cuándo rechazar premium por costo/riesgo.
Reglas
El usuario puede usar modelos free, baratos o premium.
Premium no debe usarse por defecto si no hace falta.
La elección de modelo debe quedar auditada.
No hardcodear un solo proveedor.
No romper compatibilidad con OpenRouter.
No usar any.
Test obligatorio al final.
SESIÓN 27.5 — Model Budget Controller
Objetivo

Controlar presupuesto de tokens/costo y evitar gasto innecesario en modelos premium.

Implementar recomendado
TokenBudget
CostBudget
ModelEscalationGuard
FreeModelFirstPolicy
PremiumApprovalGate
ProviderUsageLedger
estimación de costo por rol
reporte de costo por runtime loop
límites por sesión
Resultado esperado

El runtime debe poder decir:

esta tarea puede usar modelo barato;
esta tarea requiere modelo mejor;
esta tarea excede presupuesto;
esta ejecución necesita aprobación para premium;
cuánto costó una ejecución;
qué modelo se usó y por qué.
Reglas
No gastar premium sin política.
No ocultar costo estimado.
Toda escalada debe quedar auditada.
Mantener fallback barato cuando sea posible.
No network tools extra.
Test obligatorio al final.
SESIÓN 28 — Git + Checkpoint Integration
Objetivo

Agregar una capa de seguridad con git, sin reemplazar los backups internos.

Implementar recomendado
GitStatusTool
GitDiffTool
GitCheckpointTool
GitRestoreTool
GitBranchGuard
DirtyTreeGuard
PreChangeSnapshot
checkpoint antes de cambios grandes
relación entre backup interno y git checkpoint
Resultado esperado

Cada cambio importante debe poder auditarse y revertirse.

El runtime debe poder saber:

si el repo está limpio;
qué archivos cambiaron;
qué diff existe;
si conviene crear checkpoint;
si se puede restaurar.
Reglas
Git no reemplaza FileBackupManager.
No ejecutar comandos git libres.
Solo tools git explícitas y controladas.
No hacer commit automático sin aprobación.
No push.
No network.
Test obligatorio al final.

SESIÓN 29 — Sandbox Policy
Objetivo

Preparar aislamiento fuerte antes de permitir comandos.

Implementar recomendado
SandboxPolicy
FileIsolation
CommandIsolation
ResourceLimiter
SandboxManager base
AllowedCommandRegistry
CommandRiskClassifier
límites de tiempo
límites de salida
límites de directorio de trabajo
Resultado esperado

Antes de permitir shell tools, el runtime debe tener una política clara de aislamiento:

qué comandos podrían permitirse;
en qué directorio;
con qué timeout;
con qué variables;
con qué acceso a archivos;
con qué límites de output.
Reglas
No ejecutar comandos todavía.
Diseñar policy primero.
No shell libre.
No git libre.
No network.
Test obligatorio al final.

SESIÓN 30 — Runtime-Owned Shell Tools
Objetivo

Agregar ejecución de comandos controlada por runtime, sin permitir shell arbitrario.

Implementar recomendado
ShellCommandPlanner
ShellExecutionGate
AllowedCommandPolicy
DryRunCommandTool
NpmScriptTool
TestCommandTool
BuildCommandTool
CommandOutputLimiter
integración con SandboxPolicy
integración con DangerousCommandGuard
Resultado esperado

El runtime debe poder ejecutar comandos seguros como:

npm run typecheck
npm run lint
npm run build
npm test

Pero no debe permitir:

rm -rf
comandos arbitrarios del modelo;
comandos con pipes peligrosos;
comandos con acceso no controlado;
comandos de red no autorizados.
Reglas
No existe “ejecutar cualquier comando”.
Solo comandos registrados/autorizados.
Timeout obligatorio.
Output limitado.
Audit log obligatorio.
Guardrails obligatorios.
Test obligatorio al final.
SESIÓN 31 — Observability + Runtime Metrics
Objetivo

Hacer el runtime observable, medible y auditable.

Implementar recomendado
RuntimeTracer
MetricsCollector
ExecutionTimeline
TokenUsageTracker
CostTracker
PerformanceProfiler
ErrorReporter
DecisionLogViewer
métricas por sesión
métricas por loop
métricas por modelo
Resultado esperado

El usuario debe poder saber:

qué hizo el runtime;
por qué lo hizo;
qué modelo usó;
cuánto costó;
cuántos tokens usó;
qué tools ejecutó;
qué fue bloqueado;
qué falló;
cuánto tardó.
Reglas
Métricas no deben exponer secretos.
No loguear .env.
No loguear API keys.
No guardar contenido sensible innecesario.
Mantener JSON logs estructurados.
Test obligatorio al final.

SESIÓN 32 — End-to-End Benchmark Projects
Objetivo

Probar el agente en escenarios reales y medir confiabilidad.

Benchmarks recomendados
TypeScript error fix
ESLint fix
React refactor
Next.js build issue
Jest failing test
package migration pequeña
multi-file import refactor
runtime loop recovery scenario
retrieval-guided edit scenario
Implementar recomendado
BenchmarkRunner
BenchmarkCase
BenchmarkReporter
fixtures de proyectos pequeños
métricas de éxito/fallo
comparación de costo por modelo
número de replans
número de acciones bloqueadas
número de approvals
Resultado esperado

Zero Runtime debe poder medirse con datos reales:

success rate;
pasos ejecutados;
tokens usados;
costo estimado;
tiempo total;
cantidad de fallos;
cantidad de recuperaciones;
cantidad de bloqueos correctos.
Reglas
Benchmarks deben ser reproducibles.
No depender de servicios externos salvo provider LLM.
No usar repos reales sensibles.
No romper proyectos del usuario.
Test obligatorio al final.
SESIÓN 34 — Interactive CLI Foundation
Objetivo

Convertir Zero Runtime en una herramienta usable desde CLI, no solo scripts aislados.

Implementar recomendado
src/cli/
├── CliApp.ts
├── CliRouter.ts
├── CliSession.ts
├── CliPrompts.ts
├── CliRenderer.ts
├── CliCommandRegistry.ts
├── CliErrorPresenter.ts
└── commands/
├── initCommand.ts
├── inspectCommand.ts
├── validateCommand.ts
├── repairCommand.ts
├── statusCommand.ts
└── doctorCommand.ts
Comandos MVP
zero init
zero inspect
zero validate
zero repair
zero status
zero doctor
Flujo esperado

1. Usuario ejecuta zero init.
2. CLI pregunta o detecta ruta del proyecto.
3. Guarda configuración en .runtime/project.json.
4. Permite inspeccionar proyecto.
5. Permite validar proyecto.
6. Permite preparar reparación.
7. Muestra reportes claros.
   Resultado esperado

Zero Runtime debe poder usarse así:

zero init
zero inspect
zero validate
zero repair

Sin tener que ejecutar scripts internos tipo:

tsx src/examples/...
Reglas
No ejecutar comandos peligrosos.
No editar archivos todavía.
No usar git todavía.
No pedir API key si no se necesita.
Todo debe quedar auditado.
Test obligatorio.

SESIÓN 35 — Target Project Manager + Workspace Config
Objetivo

Permitir elegir y recordar proyectos objetivo de forma profesional.

Implementar recomendado
src/workspace/
├── TargetProjectManager.ts
├── WorkspaceConfig.ts
├── WorkspaceConfigStore.ts
├── TargetProjectInspector.ts
├── RuntimeWorkspaceResolver.ts
└── ProjectPathGuard.ts
Archivo esperado
.runtime/project.json

Ejemplo:

{
"projectName": "Betz Peinados",
"targetProjectRoot": "C:/Users/LUCAS/Desktop/BTZ/betz-hairstyles",
"createdAt": "...",
"updatedAt": "...",
"allowedValidationScripts": ["build", "typecheck", "lint"],
"protectedFiles": [".env", ".env.local"],
"writesRequireApproval": true
}
Resultado esperado

La CLI debe permitir:

- elegir ruta del proyecto;
- validar que existe;
- recordar proyecto activo;
- cambiar proyecto activo;
- mostrar proyecto activo;
- evitar rutas peligrosas;
- bloquear paths fuera del proyecto.
  Reglas
  No guardar secrets.
  No guardar contenido de .env.
  No asumir cwd como targetProjectRoot.
  No permitir escritura fuera del target.
  Test obligatorio.
  SESIÓN 36 — Git Awareness + Safe Change Boundaries
  Objetivo

Conectar git para operar con seguridad, similar a herramientas modernas de coding agent.

Implementar recomendado
src/git/
├── GitInspector.ts
├── GitStatusReader.ts
├── GitDiffReader.ts
├── GitBranchGuard.ts
├── GitChangeSet.ts
├── GitSafetyPolicy.ts
└── GitReporter.ts
Capacidades

- detectar si el proyecto usa git;
- leer branch actual;
- leer estado dirty/clean;
- mostrar archivos modificados;
- bloquear si hay cambios no guardados, salvo aprobación;
- generar diff antes/después;
- nunca hacer commit automático;
- nunca hacer push automático.
  Resultado esperado

Antes de escribir, Zero Runtime sabe:

qué archivos ya estaban modificados;
qué archivos tocaría;
qué diff propone;
si el working tree está limpio o no.
Reglas
No git commit automático.
No git push.
No git reset.
No git checkout destructivo.
No borrar cambios del usuario.
Test obligatorio.

SESIÓN 37 — Real Repair Proposal with LLM Provider
Objetivo

Conectar la capa RepairProposalProvider con un modelo real, manteniendo control del runtime.

Implementar recomendado
src/repair/
├── LlmRepairProposalProvider.ts
├── PatchProposalParser.ts
├── PatchProposalSchema.ts
├── RepairModelPolicy.ts
├── RepairCostEstimator.ts
└── RepairProviderFallback.ts
Flujo

1. Runtime detecta findings.
2. Runtime construye RepairRequest.
3. Runtime genera prompt.
4. LLM propone PatchProposal JSON.
5. Runtime parsea.
6. Runtime valida patch.
7. Runtime genera diff.
8. Usuario aprueba o rechaza.
   Resultado esperado

El modelo puede proponer arreglos para:

TypeScript
React
Next
ESLint
imports
tests
config
package scripts

Pero el runtime controla:

archivos permitidos;
operaciones permitidas;
secrets;
diff;
costos;
riesgo;
aprobación.
Reglas
LLM no escribe.
LLM no ejecuta tools.
LLM no decide permisos.
Runtime valida todo.
Test obligatorio con provider fake + parser real.
SESIÓN 38 — Real Repair Proposal with LLM Provider
Objetivo

Conectar el flujo de reparación con una capa de proveedor LLM, empezando por un fake provider y un parser/schema real. La IA todavía no escribe ni aplica nada: solo devuelve un PatchProposal validado por runtime.

Implementar recomendado
src/repair/
├── PatchProposalSchema.ts
├── PatchProposalParser.ts
├── FakeLlmRepairProposalProvider.ts
├── LlmRepairProposalProvider.ts
├── RepairModelPolicy.ts
├── RepairCostEstimator.ts
├── RepairProviderFallback.ts
└── RepairProposalReporter.ts
Fases
38.A — PatchProposalParser + PatchProposalSchema
38.B — FakeLlmRepairProposalProvider
38.C — Integrar provider en RepairAttemptRunner
38.D — RepairModelPolicy + CostEstimator
38.E — CLI repair usando provider configurable
Flujo esperado

1. Runtime detecta findings.
2. Runtime construye RepairRequest.
3. Runtime genera prompt.
4. Provider fake/LLM devuelve texto o JSON.
5. Runtime parsea PatchProposal.
6. Runtime valida schema.
7. Runtime valida safety.
8. Runtime genera diff preview.
9. Usuario decide aplicar con zero patch apply.
   Reglas
   LLM no escribe.
   LLM no ejecuta tools.
   LLM no decide permisos.
   Runtime valida todo.
   Runtime controla archivos permitidos.
   Runtime controla operaciones permitidas.
   Runtime controla secrets.
   Runtime controla diff.
   Runtime controla costo/riesgo.
   Runtime exige aprobación antes de aplicar.
   Fake provider primero.
   Provider real después de pasar tests.
   Resultado esperado

repair deja de ser estático y puede generar una propuesta realista de patch, primero mediante provider fake.

Tests obligatorios
npm run repair:proposal:test
npm run repair:attempt:test
npm run patch:apply:test
npm run cli:test
npm run typecheck
npm run lint
SESIÓN 39 — Interactive Agent Loop
Objetivo

Unir todo en un loop interactivo real para que Zero Runtime empiece a sentirse como herramienta usable, no como conjunto de scripts.

Implementar recomendado
src/agent/
├── AgentTypes.ts
├── InteractiveAgentLoop.ts
├── AgentTurn.ts
├── AgentActionMenu.ts
├── AgentDecisionPresenter.ts
├── AgentRuntimeBridge.ts
├── AgentStepExecutor.ts
├── AgentLoopReporter.ts
└── AgentLoopStateStore.ts
Comandos objetivo
zero repair
zero task
Experiencia esperada
zero repair

¿Qué querés arreglar?

> El error de build en TheArtist.tsx

Proyecto activo:
C:/Users/LUCAS/Desktop/BTZ/betz-hairstyles

Acciones:

1. Inspeccionar proyecto
2. Validar errores
3. Revisar git status
4. Construir contexto
5. Pedir propuesta a IA
6. Ver diff
7. Aplicar patch
8. Revalidar
9. Reportar
   Flujo esperado
10. Usuario ingresa objetivo.
11. Runtime resuelve proyecto activo.
12. Runtime inspecciona.
13. Runtime valida.
14. Runtime captura git boundary.
15. Runtime construye RepairRequest.
16. Runtime pide propuesta a provider.
17. Runtime valida proposal.
18. Runtime genera diff preview.
19. Runtime muestra diff.
20. Usuario aprueba o cancela.
21. Runtime aplica con PatchApplyRunner.
22. Runtime revalida.
23. Runtime reporta.
    Reglas
    Cada decisión debe quedar auditada.
    El usuario puede cancelar.
    El usuario puede ver diff antes de escribir.
    No aplicar sin aprobación.
    No comandos destructivos.
    No shell libre.
    No tools fuera de allowlist.
    No saltarse GitWorkingTreeGuard.
    No saltarse PatchApplyRunner.
    Resultado esperado

Zero Runtime ya puede ejecutar una demo real:

“Arreglá este error”
→ inspecciona
→ valida
→ propone
→ muestra diff
→ pide aprobación
→ aplica
→ revalida
Tests obligatorios
npm run agent:loop:test
npm run cli:test
npm run repair:attempt:test
npm run patch:apply:test
npm run git:awareness:test
npm run typecheck
npm run lint
SESIÓN 40 — Project Memory + Knowledge Integration
Objetivo

Crear memoria local del proyecto para que Zero Runtime recuerde contexto útil sin guardar secretos.

Implementar recomendado
src/memory/
├── ProjectMemoryTypes.ts
├── ProjectMemoryStore.ts
├── ProjectFactExtractor.ts
├── RepairHistoryMemory.ts
├── ValidationHistoryMemory.ts
├── MemoryRedactor.ts
├── MemoryReporter.ts
├── ProjectConventionStore.ts
└── SessionSummaryStore.ts
Archivos .runtime posibles
.runtime/
├── project-memory.json
├── decisions.jsonl
├── conventions.json
├── repair-history.jsonl
├── validation-history.jsonl
├── session-summaries/
│ ├── session-038.md
│ ├── session-039.md
│ └── session-040.md
└── architecture-notes.md
Memoria útil
stack detectado;
scripts seguros;
errores frecuentes;
archivos tocados;
decisiones previas;
fixes aplicados;
validaciones exitosas/fallidas;
preferencias operativas del usuario;
límites del proyecto;
convenciones de estructura;
frameworks usados;
comandos que funcionan;
comandos que fallan;
rutas importantes.
Reglas
No guardar secrets.
No guardar .env.
No guardar API keys.
No guardar contenido sensible innecesario.
Memoria auditable.
Memoria editable.
Memoria local por proyecto.
Redacción antes de persistir.
Resultado esperado

Zero Runtime puede decir cosas como:

Este proyecto usa Next/Cloudflare/OpenNext.
El build incluye Prisma antes de Next.
La validación TypeScript directa evita ese blocker.
El usuario prefiere no ejecutar deploy desde el agente.
Este módulo usa barrel exports.
Tests obligatorios
npm run memory:test
npm run agent:loop:test
npm run cli:test
npm run typecheck
npm run lint
SESIÓN 41 — Real Provider Adapter / OpenRouter Repair Provider

Objetivo: conectar un proveedor real, pero sin romper el principio de runtime authority.

Implementar recomendado:

src/providers/
├── OpenRouterClient.ts
├── OpenRouterTypes.ts
├── OpenRouterConfigLoader.ts
├── ProviderResponseNormalizer.ts
├── ProviderTimeoutPolicy.ts
└── ProviderErrorMapper.ts

src/repair/
├── OpenRouterRepairProposalProvider.ts
└── RealProviderRepairProposalProvider.test/smoke example

Reglas:

No confiar en output del proveedor.
No loguear API keys.
No guardar .env en reports.
No llamar proveedor real salvo opt-in explícito.
Todo output debe pasar por PatchProposalParser.
Todo PatchProposal debe pasar por schema + safety validator.
Todo provider/model debe pasar por RepairModelPolicy.
Timeouts controlados.
Errores normalizados.
Fallback si provider falla.

Tests:

npm run repair:provider-real-smoke:test
npm run repair:policy-aware-provider:test
npm run cli:agent-flow:test
npm run typecheck
npm run lint

Idealmente el smoke real debería correr solo con una env tipo:

ZERO_RUN_REAL_PROVIDER_TEST=1
OPENROUTER_API_KEY=...

Y tu modelo gratuito poolside/laguna-xs.2:free puede usarse como candidato configurable, pero no hardcodeado como única opción.

SESIÓN 42 — Project Memory + Knowledge Integration

Objetivo: que Zero Runtime recuerde y use conocimiento estructurado del proyecto.

Implementar recomendado:

src/project-memory/
├── ProjectMemoryTypes.ts
├── ProjectMemoryStore.ts
├── ProjectMemoryIndexer.ts
├── ProjectConventionScanner.ts
├── ProjectKnowledgeBuilder.ts
├── ProjectDecisionLog.ts
├── RuntimeKnowledgeResolver.ts
├── AgentMemoryContextBuilder.ts
└── ProjectMemoryReporter.ts

Debe recordar:

stack detectado
package manager
scripts permitidos
estructura de carpetas
convenciones de imports
convenciones de componentes
rutas protegidas
decisiones de arquitectura
últimos repairs
últimos patches
archivos frecuentes
errores recurrentes
comandos válidos

Resultado esperado:

zero agent / zero repair
-> lee memoria del proyecto
-> entiende convenciones
-> arma mejor contexto
-> propone cambios más coherentes

Tests:

npm run project-memory:test
npm run agent:full-loop:test
npm run cli:agent-flow:test
npm run typecheck
npm run lint
SESIÓN 43 — Hardening + Security Review

Esta sesión la mantendría como la pusiste. Ahora tiene mucho más sentido porque ya existen piezas reales que auditar:

- OpenRouter real opcional
- ProjectMemory
- repair con memoria
- agent con memoria persistida
- patch apply approval-gated
- CLI con project manager
- git awareness

Estructura recomendada:

src/security/
├── SecurityReviewTypes.ts
├── RuntimePolicyTestSuite.ts
├── SecurityRegressionTests.ts
├── SecurityReviewReporter.ts
├── ProtectedPathPolicy.ts
├── SecretLeakDetector.ts
├── PromptInjectionScanner.ts
├── PatchThreatAnalyzer.ts
├── RuntimePermissionAuditor.ts
├── ToolMisuseTests.ts
├── RetrievalPoisoningTests.ts
├── PatchSafetyRegressionTests.ts
├── GitSafetyRegressionTests.ts
├── ProviderOutputThreatTests.ts
├── ApprovalBypassRegressionTests.ts
├── AgentLoopAbuseTests.ts
├── MemoryPoisoningTests.ts
└── RuntimeReportLeakTests.ts

Riesgos a cubrir:

.env leakage
API key leakage
provider prompt injection
malicious provider output
approval bypass
patch apply replay
apply_patch double execution
path traversal
symlink traversal
protected file overwrite
delete without confirmation
dirty git bypass
memory poisoning
report leaking secrets
cost runaway
provider timeout
invalid model output
provider fallback abuse
project-memory prompt injection
agent metadata tampering
approval id spoofing
state file tampering

Agregaría también una subfase:

43.F — Security Review Report

Resultado esperado:

.runtime/security-review-report.md
.runtime/security-regression-report.json

Porque si queremos algo serio, el hardening no solo debe pasar tests: debe dejar reporte auditable.

SESIÓN 44 — Agent Real Provider Integration

Esta sesión la agregaría antes de scaffolding.

Objetivo:

Permitir que el agent use OpenRouter real en request_repair_proposal,
pero solo con opt-in persistido, policy, budget, fallback y auditoría.

Comando esperado:

zero agent start \
 --project ./target \
 --target src/file.ts \
 --objective "Fix the issue safely" \
 --provider openrouter \
 --allow-real-provider \
 --model provider/model \
 --include-project-memory

Metadata persistida:

{
"provider": "openrouter",
"providerModel": "provider/model",
"allowRealProvider": true,
"includeProjectMemory": true,
"allowPremium": false,
"premiumApproved": false,
"estimatedCompletionTokens": 1200
}

Implementar:

src/agent/
├── AgentProviderConfig.ts
├── AgentProviderPolicy.ts
├── AgentProviderConfigReader.ts
└── AgentProviderAuditReporter.ts

Modificar:

CliAgentCommand
CliCommandParser
CliRuntimeBridge.agent(start)
AgentRuntimeBridge.requestRepairProposal
AgentLoopReporter
CliOutputFormatter

Tests:

agent:provider-config:test
agent:openrouter-opt-in:test
agent:provider-policy:test
agent:real-provider-smoke:test optional/skipped by default
cli:agent-provider-flow:test

Reglas:

- agent provider real requiere --allow-real-provider
- nunca usar provider real en tests normales
- provider/model deben quedar persistidos en AgentLoopState.metadata
- steps posteriores no pueden cambiar provider silenciosamente
- provider real no implica premium
- premium requiere allowPremium + premiumApproved
- fallback debe quedar reportado
- memory no autoriza provider real
- provider real no autoriza patch apply

Esta sesión es muy importante para que después scaffolding funcione como parte del agent y no como módulo suelto.

SESIÓN 45 — Module/Project Scaffolding

Tu propuesta está muy bien. Solo la movería después de Agent Real Provider Integration.

Estructura recomendada:

src/scaffold/
├── ScaffoldTypes.ts
├── ScaffoldIntentParser.ts
├── ScaffoldRequestBuilder.ts
├── ScaffoldPlanner.ts
├── ScaffoldPlanValidator.ts
├── FileTreeProposalBuilder.ts
├── ModuleGeneratorProvider.ts
├── ScaffoldProposalParser.ts
├── ScaffoldProposalSchema.ts
├── ScaffoldSafetyValidator.ts
├── ScaffoldDiffBuilder.ts
├── ScaffoldRunner.ts
└── ScaffoldReporter.ts

Flujo obligatorio:

ScaffoldIntent
-> ScaffoldRequest
-> provider proposes scaffold proposal
-> runtime parses
-> runtime validates schema
-> runtime validates paths
-> runtime validates overwrite policy
-> runtime validates protected paths
-> runtime builds patch proposal
-> runtime shows tree + diff
-> approval gate
-> PatchApplyRunner
-> revalidate
-> report

Regla central:

Nada de scaffolding directo.
Todo pasa por proposal/diff/approval.

Comandos iniciales:

zero scaffold module \
 --project ./target \
 --name auth \
 --kind backend \
 --target src/modules/auth \
 --provider fake-llm

Después:

zero scaffold module \
 --project ./target \
 --name auth \
 --kind backend \
 --target src/modules/auth \
 --provider openrouter \
 --allow-real-provider \
 --model provider/model

También agregaría:

ScaffoldOverwritePolicy
ScaffoldProtectedPathPolicy
ScaffoldTemplateHints
ScaffoldProjectConventionReader

Porque el scaffolding bueno no solo crea archivos: respeta convenciones existentes.

SESIÓN 46 — Documentation + Developer Guide

La mantendría, pero con más énfasis en “por qué este proyecto es distinto”.

Docs recomendados:

docs/
├── architecture.md
├── runtime-flow.md
├── agent-philosophy.md
├── cli.md
├── cli-agent.md
├── workspace.md
├── git-safety.md
├── repair-flow.md
├── patch-application.md
├── security-model.md
├── provider-strategy.md
├── project-memory.md
├── agent-real-provider.md
├── scaffolding.md
├── troubleshooting.md
├── known-limitations.md
└── release-checklist.md

Agregaría explícitamente:

docs/why-runtime-authority.md

Ese doc puede ser clave para explicar la diferencia competitiva:

- LLM propone, runtime decide.
- Memoria local no es memoria del modelo.
- Provider no ejecuta.
- Patches no se aplican sin aprobación.
- Todo queda auditable.
  SESIÓN 47 — MVP Polish

Tu sesión está bien. La mantendría con algunos agregados.

Objetivos:

limpiar examples viejos
ordenar scripts
normalizar nombres
mejorar README
quickstart
demo flow
troubleshooting
known limitations
mejorar errores
ordenar .runtime
normalizar output CLI
mejorar prompts interactivos
agregar --dry-run
agregar fixtures demo

Agregaría:

src/cli/CliErrorCatalog.ts
src/cli/CliSuggestionBuilder.ts
src/cli/CliDoctorReporter.ts
src/demo/DemoProjectFactory.ts
src/demo/DemoScenarioRunner.ts

Comandos útiles:

zero doctor
zero project current
zero repair --dry-run
zero patch apply --dry-run
zero agent next
zero agent run --until approval
zero agent run --until report

Coincido con tu advertencia: agent run --until report solo si no compromete seguridad.

Mi recomendación:

zero agent run --until approval ✅
zero agent run --until report ⚠️ solo si apply_patch sigue requiriendo approval ya existente
zero agent run --auto-approve ❌ no para MVP
SESIÓN 48 — Release Candidate v0.1.0

Checklist final:

CLI funciona
Project manager funciona
Git awareness funciona
Repair proposal funciona
Real provider opcional funciona
Agent real provider opcional funciona
Patch apply funciona
Agent loop funciona
Project memory funciona
Scaffolding básico funciona
Security tests pasan
Docs existen
Demo final pasa
No secrets en repo
No .env leído o guardado
No comandos git destructivos
No auto-apply sin aprobación
No provider real sin opt-in
No premium sin aprobación
No memory poisoning sin advertencia/bloqueo
No report leaking secrets

Agregaría un comando de validación final:

npm run rc:test

Que internamente corra un set curado:

typecheck
lint
security regression
memory tests
provider tests fake
repair tests
patch apply tests
agent full loop
cli agent flow
scaffold tests
docs check

No necesariamente todos los tests pesados, pero sí los críticos.

Roadmap final compacto
SESIÓN 43 — Hardening + Security Review
Objetivo:
Auditar provider real, memory, repair, patch apply, agent loop, git y reports.

Resultado:
Security regression suite + security review report.
SESIÓN 44 — Agent Real Provider Integration

Esta sesión la agregaría antes de scaffolding.

Objetivo:

Permitir que el agent use OpenRouter real en request_repair_proposal,
pero solo con opt-in persistido, policy, budget, fallback y auditoría.

Comando esperado:

zero agent start \
 --project ./target \
 --target src/file.ts \
 --objective "Fix the issue safely" \
 --provider openrouter \
 --allow-real-provider \
 --model provider/model \
 --include-project-memory

Metadata persistida:

{
"provider": "openrouter",
"providerModel": "provider/model",
"allowRealProvider": true,
"includeProjectMemory": true,
"allowPremium": false,
"premiumApproved": false,
"estimatedCompletionTokens": 1200
}

Implementar:

src/agent/
├── AgentProviderConfig.ts
├── AgentProviderPolicy.ts
├── AgentProviderConfigReader.ts
└── AgentProviderAuditReporter.ts

Modificar:

CliAgentCommand
CliCommandParser
CliRuntimeBridge.agent(start)
AgentRuntimeBridge.requestRepairProposal
AgentLoopReporter
CliOutputFormatter

Tests:

agent:provider-config:test
agent:openrouter-opt-in:test
agent:provider-policy:test
agent:real-provider-smoke:test optional/skipped by default
cli:agent-provider-flow:test

Reglas:

- agent provider real requiere --allow-real-provider
- nunca usar provider real en tests normales
- provider/model deben quedar persistidos en AgentLoopState.metadata
- steps posteriores no pueden cambiar provider silenciosamente
- provider real no implica premium
- premium requiere allowPremium + premiumApproved
- fallback debe quedar reportado
- memory no autoriza provider real
- provider real no autoriza patch apply

Esta sesión es muy importante para que después scaffolding funcione como parte del agent y no como módulo suelto.
SESIÓN 45 — Module/Project Scaffolding

Tu propuesta está muy bien. Solo la movería después de Agent Real Provider Integration.

Estructura recomendada:

src/scaffold/
├── ScaffoldTypes.ts
├── ScaffoldIntentParser.ts
├── ScaffoldRequestBuilder.ts
├── ScaffoldPlanner.ts
├── ScaffoldPlanValidator.ts
├── FileTreeProposalBuilder.ts
├── ModuleGeneratorProvider.ts
├── ScaffoldProposalParser.ts
├── ScaffoldProposalSchema.ts
├── ScaffoldSafetyValidator.ts
├── ScaffoldDiffBuilder.ts
├── ScaffoldRunner.ts
└── ScaffoldReporter.ts

Flujo obligatorio:

ScaffoldIntent
-> ScaffoldRequest
-> provider proposes scaffold proposal
-> runtime parses
-> runtime validates schema
-> runtime validates paths
-> runtime validates overwrite policy
-> runtime validates protected paths
-> runtime builds patch proposal
-> runtime shows tree + diff
-> approval gate
-> PatchApplyRunner
-> revalidate
-> report

Regla central:

Nada de scaffolding directo.
Todo pasa por proposal/diff/approval.

Comandos iniciales:

zero scaffold module \
 --project ./target \
 --name auth \
 --kind backend \
 --target src/modules/auth \
 --provider fake-llm

Después:

zero scaffold module \
 --project ./target \
 --name auth \
 --kind backend \
 --target src/modules/auth \
 --provider openrouter \
 --allow-real-provider \
 --model provider/model

También agregaría:

ScaffoldOverwritePolicy
ScaffoldProtectedPathPolicy
ScaffoldTemplateHints
ScaffoldProjectConventionReader

Porque el scaffolding bueno no solo crea archivos: respeta convenciones existentes.
SESIÓN 46 — Documentation + Developer Guide

La mantendría, pero con más énfasis en “por qué este proyecto es distinto”.

Docs recomendados:

docs/
├── architecture.md
├── runtime-flow.md
├── agent-philosophy.md
├── cli.md
├── cli-agent.md
├── workspace.md
├── git-safety.md
├── repair-flow.md
├── patch-application.md
├── security-model.md
├── provider-strategy.md
├── project-memory.md
├── agent-real-provider.md
├── scaffolding.md
├── troubleshooting.md
├── known-limitations.md
└── release-checklist.md

Agregaría explícitamente:

docs/why-runtime-authority.md

Ese doc puede ser clave para explicar la diferencia competitiva:

- LLM propone, runtime decide.
- Memoria local no es memoria del modelo.
- Provider no ejecuta.
- Patches no se aplican sin aprobación.
- Todo queda auditable.
  SESIÓN 47 — MVP Polish

Tu sesión está bien. La mantendría con algunos agregados.

Objetivos:

limpiar examples viejos
ordenar scripts
normalizar nombres
mejorar README
quickstart
demo flow
troubleshooting
known limitations
mejorar errores
ordenar .runtime
normalizar output CLI
mejorar prompts interactivos
agregar --dry-run
agregar fixtures demo

Agregaría:

src/cli/CliErrorCatalog.ts
src/cli/CliSuggestionBuilder.ts
src/cli/CliDoctorReporter.ts
src/demo/DemoProjectFactory.ts
src/demo/DemoScenarioRunner.ts

Comandos útiles:

zero doctor
zero project current
zero repair --dry-run
zero patch apply --dry-run
zero agent next
zero agent run --until approval
zero agent run --until report

Coincido con tu advertencia: agent run --until report solo si no compromete seguridad.

Mi recomendación:

zero agent run --until approval ✅
zero agent run --until report ⚠️ solo si apply_patch sigue requiriendo approval ya existente
zero agent run --auto-approve ❌ no para MVP
SESIÓN 48 — Release Candidate v0.1.0

Checklist final:

CLI funciona
Project manager funciona
Git awareness funciona
Repair proposal funciona
Real provider opcional funciona
Agent real provider opcional funciona
Patch apply funciona
Agent loop funciona
Project memory funciona
Scaffolding básico funciona
Security tests pasan
Docs existen
Demo final pasa
No secrets en repo
No .env leído o guardado
No comandos git destructivos
No auto-apply sin aprobación
No provider real sin opt-in
No premium sin aprobación
No memory poisoning sin advertencia/bloqueo
No report leaking secrets

Agregaría un comando de validación final:

npm run rc:test

Que internamente corra un set curado:

typecheck
lint
security regression
memory tests
provider tests fake
repair tests
patch apply tests
agent full loop
cli agent flow
scaffold tests
docs check

SESIÓN 49 — Release Candidate v0.1.0 Final Pass

Objetivo: no agregar features. Solo cerrar estabilidad, seguridad, limpieza y preparación de release.

49.A — Git / repo hygiene final pass

- revisar git status
- confirmar .env no trackeado
- confirmar .runtime basura no trackeada
- revisar .gitignore
- revisar archivos generados por quickstart/tests
- limpiar outputs temporales
- confirmar que docs sí estén trackeados
  49.B — Package / scripts final audit
- revisar package.json
- confirmar name/version/license
- confirmar scripts principales
- confirmar rc:test
- confirmar real-provider:test separado
- confirmar que mvp:test no use provider real
- confirmar que no haya scripts duplicados/confusos
  49.C — README / docs final consistency
- revisar README.md
- revisar docs/index.md
- revisar docs/quickstart.md
- revisar docs/security-model.md
- revisar docs/release-checklist.md
- revisar docs/provider-openrouter.md
- corregir inconsistencias de nombres/env vars/comandos
- no crear docs enormes nuevos salvo necesidad
  49.D — Release readiness report final polish
- mejorar output de release-readiness-test si hace falta
- validar checks semánticos mínimos
- validar docs críticas
- validar provider separation
- validar quickstart/product-flow
  49.E — Final RC gate
- npm run typecheck
- npm run lint
- npm run release:readiness:test
- npm run mvp:test
- npm run rc:test
  49.F — v0.1.0 release checklist
- generar checklist final humano
- listar qué está incluido en v0.1.0
- listar qué NO está incluido
- listar known limitations
- listar comandos principales
- listar próximos pasos post-v0.1.0
  SESIÓN 50 — MVP Usability Pass / First External User Test

Objetivo: probarlo como si fueras un usuario técnico externo.

50.A — Fresh clone simulation

- simular proyecto limpio
- npm install
- npm run check
- npm run cli -- help
- npm run cli -- quickstart
- npm run rc:test
  50.B — First real target project trial
- usar un proyecto real pequeño
- zero doctor
- zero inspect
- zero validate
- zero repair con fake provider
- patch dry-run
- revisar diff
- aplicar si corresponde
  50.C — UX friction log
- anotar errores incómodos
- mensajes confusos
- comandos largos
- outputs ruidosos
- docs insuficientes
  50.D — Minor polish only
- corregir mensajes
- corregir docs
- corregir comandos ambiguos
- no features grandes

SESIÓN 52 — Post-MVP Real Usability Upgrade

Objetivo: empezar a hacerlo más cómodo y útil para uso real diario.

52.A — Interactive mode real

- zero scaffold module --interactive
- zero repair --interactive
- zero agent run --interactive
- selección de proyecto
- selección de target
- selección de provider
  52.B — Better project onboarding
- zero project init
- zero project current
- zero project doctor
- presets
- workspace más cómodo
  52.C — Better agent run modes
- zero agent run --until approval
- zero agent run --until report
- mantener apply approval-gated
- NO auto-approve todavía
  52.D — Better reports
- reportes más legibles
- resumen ejecutivo
- diff links/paths
- decisiones tomadas
- bloqueos
- próximos pasos

INTERFAZ

FASE 1 — Base de plataforma interactiva
SESIÓN 54 — Interactive Session Core

Objetivo: crear el núcleo de sesiones vivas.

Implementar:

src/interactive/
├── InteractiveSession.ts
├── InteractiveSessionState.ts
├── InteractiveSessionTypes.ts
├── SessionGoalTracker.ts
├── SessionTimeline.ts
├── SessionDecisionLog.ts
└── InteractiveSessionStore.ts

Debe permitir:

- iniciar sesión
- pausar sesión
- continuar sesión
- guardar objetivo general
- guardar mensajes del usuario
- guardar decisiones
- guardar acciones del runtime
- guardar estado actual

Estados:

idle
analyzing_project
collecting_context
planning
waiting_user_input
waiting_approval
applying_patch
verifying
completed
failed
paused

Resultado esperado:

Zero ya no ejecuta tareas sueltas.
Ahora trabaja dentro de una sesión persistente.
SESIÓN 55 — Interactive Command Router

Objetivo: que el usuario pueda dar órdenes durante una sesión.

Implementar:

src/interactive/
├── InteractiveCommandRouter.ts
├── InteractiveCommandParser.ts
├── InteractiveCommandTypes.ts
└── InteractiveCommandHandler.ts

Comandos iniciales:

/plan
/context
/files
/diff
/risks
/apply
/reject
/revise
/verify
/report
/pause
/resume

También debe aceptar texto natural:

"Ahora revisá el backend"
"No toques la base de datos todavía"
"Aplicá solo el frontend"
"Mostrame qué archivos pensás modificar"

Resultado esperado:

La sesión empieza a sentirse conversacional e interactiva.
SESIÓN 56 — Project Registry + Project Picker

Objetivo: registrar proyectos locales y elegirlos desde CLI/UI.

Implementar:

src/projects/
├── ProjectRegistry.ts
├── ProjectProfile.ts
├── ProjectScanner.ts
├── ProjectDetector.ts
└── ProjectConfigStore.ts

Debe detectar:

- MERN
- PERN
- React
- Express
- Node
- TypeScript
- JavaScript
- MongoDB
- PostgreSQL
- Prisma
- Vite
- Next.js

Config local:

.zero/project.json

Ejemplo:

{
"name": "micafecito",
"stack": ["react", "node", "express", "postgres"],
"workingMode": "local_snapshot",
"gitRequired": false
}

Resultado esperado:

Zero puede abrir proyectos reales y recordar configuración.
FASE 2 — Git opcional y snapshots locales
SESIÓN 57 — Workspace Modes

Objetivo: permitir trabajar con o sin Git.

Implementar:

src/workspace/
├── WorkspaceMode.ts
├── WorkspaceSession.ts
├── LocalPatchlessWorkspace.ts
├── LocalSnapshotWorkspace.ts
├── GitWorkspace.ts
└── WorkspaceModeResolver.ts

Modos:

local_patchless
local_snapshot
git_diff
git_branch_pr

Regla:

Git nunca debe ser obligatorio.

Resultado esperado:

Zero puede trabajar en proyectos sin repositorio Git.
SESIÓN 58 — Local Snapshot Manager

Objetivo: revertir cambios aunque no haya Git.

Implementar:

src/workspace/
├── LocalSnapshotManager.ts
├── SnapshotManifest.ts
├── SnapshotRestoreService.ts
└── SnapshotDiffService.ts

Debe guardar:

.runtime/snapshots/session-id/
├── manifest.json
├── before/
├── after/
└── rollback.patch

Resultado esperado:

Antes de aplicar cambios, Zero guarda copia segura de los archivos afectados.
SESIÓN 59 — Git Status + Diff Integration

Objetivo: integrar Git solo si existe.

Implementar:

src/vcs/
├── VcsProvider.ts
├── GitStatusService.ts
├── GitDiffService.ts
├── GitBranchService.ts
└── GitCommitService.ts

Funciones:

- detectar repo Git
- ver branch actual
- ver cambios pendientes
- generar diff
- crear branch opcional
- crear commit opcional

Reglas:

- no commit automático sin aprobación
- no push automático
- no modificar repo si modo local está activo
  SESIÓN 60 — GitHub CLI Integration

Objetivo: conectar con GitHub usando gh, no tokens propios.

Implementar:

src/vcs/github/
├── GitHubCliDetector.ts
├── GitHubAuthStatus.ts
├── GitHubPullRequestService.ts
└── GitHubRemoteResolver.ts

Debe permitir:

- detectar si gh está instalado
- detectar si gh está autenticado
- mostrar estado GitHub
- crear PR opcional

Acciones futuras:

[Crear branch]
[Crear commit]
[Subir cambios]
[Crear Pull Request]

Resultado esperado:

Zero puede integrarse con GitHub sin manejar tokens directamente.
FASE 3 — API local para plataforma visual

SESIÓN 61 — Local Runtime API Server

Objetivo: exponer el runtime a una interfaz gráfica local.

Implementar:

src/server/
├── LocalRuntimeServer.ts
├── RuntimeApiRouter.ts
├── SessionApi.ts
├── ProjectApi.ts
├── WorkspaceApi.ts
└── HealthApi.ts

Endpoints:

GET /api/health
GET /api/projects
POST /api/projects
POST /api/sessions
GET /api/sessions/:id
POST /api/sessions/:id/message
GET /api/sessions/:id/timeline
GET /api/sessions/:id/context
GET /api/sessions/:id/patches
POST /api/sessions/:id/approve
POST /api/sessions/:id/reject

Resultado esperado:

La futura UI puede controlar Zero Runtime.
SESIÓN 62 — Realtime Session Events

Objetivo: que la UI vea lo que pasa en vivo.

Implementar:

src/server/
├── RuntimeEventBus.ts
├── SessionEventStream.ts
├── SessionEventTypes.ts
└── WebSocketGateway.ts

Eventos:

session.started
project.scanned
context.collected
plan.proposed
patch.proposed
risk.detected
approval.required
patch.applied
verification.completed
audit.generated

Resultado esperado:

La UI puede mostrar una línea de tiempo viva.
FASE 4 — Frontend gráfico local
SESIÓN 63 — Crear Web UI base

Objetivo: crear interfaz visual.

Estructura:

ui/
├── package.json
├── vite.config.ts
├── src/
│ ├── main.tsx
│ ├── App.tsx
│ ├── api/
│ ├── components/
│ ├── pages/
│ ├── layouts/
│ └── types/

Stack recomendado:

React
Vite
TypeScript
Tailwind
shadcn/ui opcional

Pantallas iniciales:

ProjectsPage
SessionPage
SettingsPage

Resultado esperado:

localhost abre una UI básica de Zero Runtime.
SESIÓN 64 — Project Picker UI

Objetivo: seleccionar proyectos desde la interfaz.

Componentes:

ProjectPicker.tsx
ProjectCard.tsx
AddProjectDialog.tsx
ProjectStackBadge.tsx
WorkspaceModeSelector.tsx

Debe mostrar:

- nombre
- ruta
- stack detectado
- Git disponible sí/no
- modo de trabajo
- última sesión

Resultado esperado:

Abrís Zero y elegís sobre qué proyecto trabajar.
SESIÓN 65 — Interactive Session UI

Objetivo: crear pantalla principal de trabajo.

Layout:

SessionPage
├── ChatPanel
├── RuntimeStatusBar
├── TimelinePanel
├── ContextPanel
├── PlanPanel
├── PatchPanel
└── ApprovalPanel

Debe permitir:

- escribir instrucciones
- ver respuesta del runtime
- ver estado actual
- seguir una sesión viva
- enviar comandos

Resultado esperado:

Zero deja de parecer CLI y empieza a parecer plataforma.
SESIÓN 66 — Context Viewer

Objetivo: mostrar qué está leyendo Zero y por qué.

Componentes:

ContextViewer.tsx
ContextFileCard.tsx
RelatedFilesGraph.tsx
ContextReasonBadge.tsx

Debe mostrar:

- archivos leídos
- archivos sugeridos
- razón de selección
- archivos bloqueados
- paths protegidos

Ejemplo:

ProfileEditForm.tsx
Razón: componente principal afectado por la tarea.

api/profile.ts
Razón: cliente HTTP usado por el componente.

Resultado esperado:

El usuario entiende de dónde sale el contexto.
SESIÓN 67 — Plan Proposal Viewer

Objetivo: mostrar planes antes de generar patches.

Componentes:

PlanViewer.tsx
PlanStepCard.tsx
RiskBadge.tsx
PlanActions.tsx

Acciones:

[Aprobar plan]
[Pedir cambios]
[Agregar restricción]
[Ver contexto]
[Cancelar]

Resultado esperado:

Zero pregunta antes de avanzar con cambios importantes.
SESIÓN 68 — Patch Diff Viewer

Objetivo: mostrar cambios visualmente.

Componentes:

PatchDiffViewer.tsx
FileDiffTabs.tsx
DiffLine.tsx
PatchSummary.tsx

Debe mostrar:

- archivos creados
- archivos modificados
- archivos eliminados
- líneas agregadas
- líneas removidas
- riesgo por archivo

Resultado esperado:

El usuario puede revisar el cambio antes de aprobar.
SESIÓN 69 — Approval Panel

Objetivo: aprobación clara y segura.

Componentes:

ApprovalPanel.tsx
ApprovalRiskSummary.tsx
ApprovalChecklist.tsx
ApprovalActions.tsx

Acciones:

[Aprobar y aplicar]
[Aplicar solo este archivo]
[Rechazar]
[Pedir revisión]
[Guardar como propuesta]

Reglas:

- no aplicar sin aprobación
- mostrar riesgo
- mostrar modo workspace
- mostrar si hay snapshot
- mostrar si Git está activo

Resultado esperado:

El usuario controla exactamente qué se aplica.
FASE 5 — Interactividad avanzada
SESIÓN 70 — Runtime Suggestions

Objetivo: que Zero sugiera próximos pasos.

Implementar:

src/suggestions/
├── SuggestionEngine.ts
├── SuggestionTypes.ts
├── ProjectSuggestionScanner.ts
├── ErrorSuggestionScanner.ts
└── ArchitectureSuggestionScanner.ts

Ejemplos:

- “Detecté errores TypeScript. ¿Querés revisarlos?”
- “Este proyecto parece MERN. ¿Querés que analice rutas backend?”
- “Hay cambios sin snapshot. Recomiendo crear uno.”
- “Este patch toca auth. Recomiendo revisión alta.”

Resultado esperado:

Zero no solo responde; también guía.
SESIÓN 71 — Runtime Questions

Objetivo: que Zero haga preguntas útiles antes de actuar.

Implementar:

src/interactive/
├── RuntimeQuestion.ts
├── RuntimeQuestionEngine.ts
├── QuestionPriority.ts
└── QuestionAnswerStore.ts

Ejemplos:

“¿Querés trabajar solo frontend o también backend?”
“¿Puedo modificar package.json si hace falta?”
“¿Preferís mantener este patrón actual o refactorizar?”
“¿Querés modo local_snapshot o git_diff?”

Regla:

Preguntar solo cuando la respuesta cambie el resultado.

Resultado esperado:

Zero se vuelve colaborativo, no automático a ciegas.
SESIÓN 72 — Multi-Step Task Queue

Objetivo: permitir varias tareas dentro de una sesión.

Implementar:

src/tasks/
├── SessionTask.ts
├── SessionTaskQueue.ts
├── TaskStatus.ts
├── TaskDependencyResolver.ts
└── TaskProgressReporter.ts

Estados:

pending
in_progress
waiting_user
blocked
completed
cancelled

Ejemplo:

Objetivo: mejorar login

Tareas:

1. revisar auth backend
2. revisar frontend login
3. detectar validaciones faltantes
4. proponer patch frontend
5. proponer patch backend
6. verificar build

Resultado esperado:

Zero puede trabajar por etapas, no solo una respuesta.
SESIÓN 73 — Session Memory + Decisions

Objetivo: recordar decisiones tomadas durante la sesión.

Implementar:

src/interactive/
├── SessionDecision.ts
├── SessionDecisionStore.ts
├── DecisionApplier.ts
└── DecisionConflictDetector.ts

Ejemplos:

- “No tocar backend en esta sesión”
- “Usar archivos completos si son cortos”
- “No usar any”
- “Trabajar en modo local_snapshot”

Resultado esperado:

Zero mantiene coherencia durante sesiones largas.
FASE 6 — MERN/PERN intelligence
SESIÓN 74 — MERN/PERN Project Intelligence

Objetivo: detectar arquitectura MERN/PERN.

Implementar:

src/languages/
├── JavaScriptProfile.ts
├── TypeScriptProfile.ts
├── ReactProfile.ts
├── ExpressProfile.ts
├── MongoProfile.ts
├── PostgresProfile.ts
└── ProjectStackDetector.ts

Detectar:

- frontend React/Vite/Next
- backend Express
- Mongo/Mongoose
- PostgreSQL/Prisma/pg
- rutas API
- controllers
- services
- middlewares
- env usage

Resultado esperado:

Zero entiende mejor proyectos MERN/PERN reales.
SESIÓN 75 — API Route Mapper

Objetivo: mapear rutas backend.

Implementar:

src/intelligence/api/
├── ExpressRouteScanner.ts
├── ApiRouteMap.ts
├── ControllerResolver.ts
└── MiddlewareResolver.ts

Resultado esperado:

Zero puede decir:
POST /api/profile usa profileController.updateProfile y authMiddleware.
SESIÓN 76 — Frontend API Usage Mapper

Objetivo: conectar frontend con backend.

Implementar:

src/intelligence/frontend/
├── ApiClientScanner.ts
├── FetchUsageScanner.ts
├── AxiosUsageScanner.ts
└── FrontendBackendLinker.ts

Resultado esperado:

Zero detecta qué componentes llaman qué endpoints.

Esto es muy útil para /MERN/PERN.
FASE 7 — Verificación y reportes visuales
SESIÓN 77 — Safe Verify Commands

Objetivo: correr comandos seguros opcionales.

Implementar:

src/verify/
├── VerifyCommandPolicy.ts
├── VerifyCommandRegistry.ts
├── PackageScriptScanner.ts
└── VerifyRunner.ts

Comandos permitidos:

npm run build
npm run lint
npm run typecheck
tsc --noEmit

Reglas:

- siempre pedir aprobación antes de ejecutar
- bloquear comandos peligrosos
- mostrar salida resumida
  SESIÓN 78 — Visual Audit Timeline

Objetivo: convertir auditoría en línea de tiempo visual.

Componentes:

AuditTimeline.tsx
AuditEventCard.tsx
BlockedActionCard.tsx
AppliedPatchCard.tsx
RuntimeDecisionCard.tsx

Debe mostrar:

- qué pidió el usuario
- qué leyó Zero
- qué propuso
- qué bloqueó
- qué aprobaste
- qué aplicó
- qué quedó pendiente
  SESIÓN 79 — Session Report Export

Objetivo: exportar reporte final.

Implementar:

src/reports/
├── SessionReportBuilder.ts
├── MarkdownReportExporter.ts
├── JsonReportExporter.ts
└── ReportStorage.ts

Formatos:

.runtime/reports/session-id.md
.runtime/reports/session-id.json
FASE 8 — Producto local usable
SESIÓN 80 — Local App Launcher

Objetivo: levantar backend + UI con un comando.

Comando:

zero runtime

Debe iniciar:

- runtime API server
- UI local
- abrir navegador opcional
  SESIÓN 96.E — File-Level Patch Review + Selective Approval
  Objetivo

Convertir los patches en unidades revisables por archivo.

Hoy el patch puede tocar varios archivos, pero el usuario no tiene una revisión suficientemente clara por cada uno. Esta sesión debe hacer que cada archivo del patch tenga su propio resumen, riesgo y estado de aprobación.

Implementar
src/patches/
├── PatchFileReview.ts
├── PatchFileReviewBuilder.ts
├── PatchSelectionPolicy.ts

Modificar:

src/patches/PatchProposal.ts
src/patches/RuntimePatchProviderSchema.ts
src/patches/RuntimePatchProviderBridge.ts
src/approval/ApprovalCenter.ts
src/approval/ApprovalRequest.ts
ui/src/components/patch/
ui/src/components/approval/
Modelo esperado

Cada archivo del patch debe tener metadata clara:

interface PatchFileChange {
path: string;
operation: 'modify' | 'create' | 'delete';
beforeHash: string | null;
content: string | null;
reason: string;
changesSummary: string[];
riskLevel: 'low' | 'medium' | 'high';
userSelectable: true;
}

Ejemplo visible para el usuario:

src/components/sections/Hero.tsx

Summary:

- Improves mobile spacing.
- Fixes CTA overlap.
- Adjusts headline hierarchy.

Risk:
medium

Reason:
This component controls the landing hero section and is directly related to the requested UI improvement.
UI esperada

En la pestaña Patch:

Patch Review
├─ Summary general
├─ File cards
│ ├─ checkbox aprobar archivo
│ ├─ resumen
│ ├─ riesgo
│ ├─ diff
│ └─ reason
├─ Approve selected
├─ Approve all
├─ Reject selected
└─ Ask revision
Reglas

- No aplicar archivos no aprobados.
- No confiar en summaries de la LLM sin validación runtime.
- Si un archivo toca path sensible, marcar high risk o bloquear.
- Si hay muchos archivos, exigir aprobación selectiva.
- Mantener compatibilidad con approve_all.
  Resultado esperado

El usuario puede aprobar solo algunos archivos del patch.

SESIÓN 96.F — Selective Patch Apply
Objetivo

Permitir que el runtime aplique únicamente los archivos aprobados.

No sirve aprobar archivos individualmente si después el apply aplica todo el patch original. Esta sesión conecta la aprobación selectiva con el apply real.

Implementar
src/patches/
├── PatchProposalFilter.ts
├── ApprovedPatchBuilder.ts

Modificar:

src/patches/RuntimePatchApplyBridge.ts
src/api/RuntimeApiController.ts
src/approval/ApprovalCenter.ts
ui/src/pages/SessionPage.tsx
Flujo esperado
Original proposal:

- Hero.tsx
- Navbar.tsx
- globals.css

Usuario aprueba:

- Hero.tsx
- globals.css

Runtime crea proposal filtrado:

- Hero.tsx
- globals.css

Runtime valida de nuevo
Runtime genera diff filtrado
Runtime aplica solo eso
Reglas

- Nunca aplicar todo y luego revertir partes.
- Filtrar antes de diff/apply.
- Revalidar proposal filtrado.
- Recalcular risk level del proposal filtrado.
- Mantener trazabilidad del proposal original.
  Resultado esperado

El usuario puede aprobar y aplicar solo archivos seleccionados.

SESIÓN 96.G — Patch Risk Policy por cantidad y tipo de cambio
Objetivo

Crear una política profesional para decidir cuándo un patch es simple, medio o riesgoso.

No conviene limitar arbitrariamente a 2 archivos. Conviene clasificar.

Implementar
src/patches/
├── PatchRiskPolicy.ts
├── PatchSizeClassifier.ts
├── PatchImpactAnalyzer.ts
Política recomendada
1 archivo:

- low o medium según path
- puede avanzar con approval normal

2 a 5 archivos:

- medium por defecto
- requiere aprobación por archivo
- requiere snapshot
- requiere verify

6+ archivos:

- high o staged patch
- requiere dividir en batches
- no aplicar todo junto salvo aprobación avanzada
  Más reglas
- package.json, tsconfig, providers, security, apply, runtime core => high risk
- frontend UI aislado => low/medium
- database, migrations, prisma, .env => blocked o high approval
- delete operations => bloqueadas por defecto
  Resultado esperado

El runtime no bloquea cambios grandes sin criterio, pero tampoco deja pasar patches peligrosos.

SESIÓN 96.H — Patch Verification Sandbox
Objetivo

Probar patches antes del apply real.

El usuario no debería recibir un patch y descubrir que rompe el proyecto después de aplicarlo. El runtime debe poder hacer una verificación segura.

Implementar
src/sandbox/
├── PatchSandbox.ts
├── SandboxWorkspaceManager.ts
├── SandboxPatchApplier.ts
├── SandboxVerifyRunner.ts
├── SandboxResult.ts
Flujo MVP recomendado

Primero puede ser con snapshot local, no Docker:

1. Crear snapshot
2. Aplicar patch temporalmente
3. Ejecutar verify commands aprobados
4. Si falla:
   - guardar errores
   - rollback automático
   - bloquear apply real
5. Si pasa:
   - marcar patch como verified
   - permitir apply real
     Verificaciones iniciales
     npm run typecheck
     npm run build
     npm run lint
     tsc --noEmit

Solo comandos permitidos y con aprobación runtime.

Resultado esperado

Antes de aplicar real, Zero puede decir:

Sandbox verification passed:

- npm run typecheck: ok
- npm run build: ok

Patch is safe to apply.

O:

Sandbox verification failed:

- npm run build failed
- Error in Hero.tsx line 42
- Runtime rolled back sandbox changes
- Apply real is blocked
  SESIÓN 96.I — Failed Patch Recovery Loop
  Objetivo

Si un patch falla verificación, Zero debe poder pedir una corrección al provider sin dejar al usuario tirado.

No queremos:

“Dio error, perdón.”

Queremos:

“El patch falló verificación. Runtime lo bloqueó, hizo rollback, y puede pedir una propuesta corregida con estos errores.”
Implementar
src/patches/
├── PatchFailureReport.ts
├── PatchRepairPromptBuilder.ts
├── PatchRecoveryLoop.ts
Flujo
Patch proposal
-> sandbox apply
-> verify fails
-> collect errors
-> provider receives:

- original objective
- failed diff
- failed files
- verify output
- constraints
  -> provider proposes corrected patch
  -> runtime validates again
  -> sandbox verifies again
  Reglas
- Limitar intentos: máximo 2 o 3.
- Cada intento debe quedar auditado.
- No aplicar nada real si verify falla.
- Mostrar historial de intentos.
  Resultado esperado

Zero puede auto-corregir patches fallidos sin perder control runtime.

SESIÓN 96.J — Patch Diff Viewer Layout Fix
Objetivo

Hacer que la pestaña Patch sea cómoda, profesional y usable.

Ahora la UI se ve comprimida y el diff no tiene foco suficiente.

Nueva estructura visual
Patch tab
├─ Header compacto
│ ├─ proposal status
│ ├─ risk
│ ├─ files count
│ ├─ additions/deletions
│ └─ actions
├─ File review sidebar
│ ├─ lista de archivos
│ ├─ checkbox approval
│ └─ risk badges
└─ Main diff viewer
├─ file summary
├─ reason
├─ changes summary
└─ line diff
Reglas UI

- Diff a ancho completo.
- Nada de columnas angostas.
- Controlled apply colapsado hasta que haga falta.
- Approval visible pero no invasivo.
- Sin scroll horizontal global.
- File list sticky o lateral.
  Resultado esperado

El usuario entiende el patch sin tener que scrollear eternamente ni ver cards superpuestas.

SESIÓN 96.K — Runtime Patch Report
Objetivo

Cada patch debe generar un reporte claro.

Implementar
src/reports/
├── PatchReviewReportBuilder.ts
├── PatchVerificationReportBuilder.ts
El reporte debe incluir

- objetivo original
- provider usado
- modelo usado
- archivos propuestos
- archivos aprobados
- archivos rechazados
- riesgos
- diff summary
- sandbox result
- verify result
- apply result
- rollback info
  Resultado esperado

Al final de cada flujo, el usuario tiene trazabilidad completa.

SESIÓN 96.L — Visual Preview Foundation
Objetivo

Preparar la base para previsualizar cambios visuales.

Esto no tiene que ser perfecto al inicio. Pero sí debe abrir el camino.

MVP

- detectar dev script
- permitir ejecutar dev server con aprobación
- guardar URL local
- mostrar instrucciones de preview
- permitir marcar visual review como aprobado manualmente
  Más adelante
- screenshot before
- screenshot after
- comparación automática
- detectar overflow/layout roto
- Playwright visual check
  Resultado esperado

Para cambios UI, Zero puede decir:

Build passed.
Preview server available at http://localhost:3000.
Please review visual changes before real apply.

Más adelante debería poder mostrar screenshots.

SESIÓN 96.M — Visual Regression / Screenshot Preview
Objetivo

Agregar comparación visual real.

Implementar más adelante
src/visual/
├── VisualPreviewRunner.ts
├── ScreenshotCapture.ts
├── VisualDiffAnalyzer.ts
├── VisualRegressionReport.ts
Flujo ideal

1. Capturar screenshot before
2. Aplicar patch en sandbox
3. Levantar app
4. Capturar screenshot after
5. Mostrar before/after
6. Usuario aprueba visualmente
   Resultado esperado

Esto sería una feature diferencial fuerte frente a agentes comunes.
SESIÓN 96.N — Runtime Workflow State Integration
Objetivo

Que el workflow oficial del runtime entienda el flujo nuevo, no solo la UI local.

Hoy la UI puede mostrar sandbox/recovery, pero el RuntimeWorkflowStateMachine debe entender formalmente:

diff ready
sandbox pending
sandbox passed
sandbox failed
recovery available
recovery prepared
repaired proposal generated
max attempts reached
apply allowed only after sandbox passed
Implementar
src/workflow/RuntimeWorkflowState.ts
src/workflow/RuntimeWorkflowStateMachine.ts
src/workflow/RuntimeActionAvailability.ts
ui/src/components/workflow/\*

Agregar estado al artifact state:

sandboxPassed
sandboxFailed
sandboxBlocked
recoveryAvailable
recoveryPrepared
recoveryMaxAttemptsReached
repairedProposalGenerated
Resultado esperado

El workflow oficial debe guiar así:

Generate Diff
→ Verify in Sandbox
→ if failed: Prepare Recovery
→ Generate Repaired Patch
→ Generate Diff again
→ Verify Sandbox again
→ Apply
→ Report
Tests
workflow-sandbox-recovery-state-test
workflow-recovery-action-availability-test
SESIÓN 96.O — Apply Gate + Workflow Hardening Final
Objetivo

Cerrar cualquier bypass antes del apply real.

Ya tenemos:

apply real exige sandboxResult.status === passed
apply real exige approvalDecision
dry-run sigue permitido

Pero ahora hay que endurecerlo contra casos reales.

Reglas finales

El apply real debe bloquear si:

- sandboxResult falta
- sandboxResult.status !== passed
- sandboxResult.proposalId no coincide
- sandboxResult.sessionId no coincide
- sandboxResult.projectRoot no coincide
- diff.proposalId no coincide
- approvalDecision falta
- approvalDecision no corresponde al diff/proposal
- selectedFilePaths no coincide con proposal filtrado
- sandbox pertenece a proposal viejo luego de repaired patch
  Implementar

Probablemente tocar:

src/api/RuntimeApiController.ts
src/approval/PatchApplyAuthorization.ts
src/approval/ApprovalDecisionStore.ts
src/sandbox/SandboxResultStorage.ts
Resultado esperado

El runtime debe ser autoridad absoluta:

No sandbox passed + no approval = no apply.
Tests
patch-apply-rejects-old-sandbox-test
patch-apply-rejects-wrong-proposal-sandbox-test
patch-apply-rejects-recovery-stale-approval-test
patch-apply-allows-repaired-proposal-after-new-sandbox-test
SESIÓN 96.P — End-to-End UI Flow Test / Real Project Simulation
Objetivo

Simular el flujo MVP completo como usuario real.

No alcanza con tests unitarios. Hay que validar el camino completo:

start session
prepare workflow
generate plan
generate patch
generate diff
approve
sandbox fails
prepare recovery
generate repaired patch
generate new diff
approve again
sandbox passes
apply real
export report
Implementar

Crear un proyecto fake realista:

.runtime/e2e-zero-mvp-test/project
├── package.json
├── tsconfig.json
└── src/value.ts

Simular:

- patch roto
- sandbox fallido
- recovery generado
- repaired patch válido
- sandbox passed
- apply real
- report export
  Tests
  src/examples/zero-runtime-mvp-e2e-flow-test.ts
  Resultado esperado

El test debe demostrar:

- El proyecto original no cambia cuando sandbox falla
- El provider repair produce nueva propuesta
- El apply real solo ocurre después de nuevo sandbox passed
- El reporte contiene sandbox + recovery + apply final
  SESIÓN 96.Q — Cleanup + Roadmap Checkpoint
  Objetivo

Cerrar la sesión 96 limpiamente.

Tareas

- Revisar nombres de scripts package.json
- Revisar tests duplicados o demasiado largos
- Asegurar que todos los nuevos artifacts están indexados
- Validar que UI build pasa
- Validar typecheck root + UI
- Dejar resumen técnico
- Preparar prompt para nueva conversación
  Checklist final
  npm run typecheck
  npm run test:patch-sandbox-verification
  npm run test:patch-sandbox-failure
  npm run test:patch-recovery-loop
  npm run test:patch-recovery-storage
  npm run test:patch-recovery-auto-attempt
  npm run test:session-report-export-sandbox-recovery
  npm run test:artifact-store-sandbox-recovery
  cd ui
  npm run typecheck
  npm run build

Resultado esperado:

Sesión 96 cerrada.
Patch lifecycle profesional completo.
Después de la sesión 96: Roadmap MVP final
SESIÓN 97 — Runtime UX Polish + Guided Flow Final
Objetivo

Hacer que la plataforma se sienta usable, clara y moderna.

Implementar

- Mejorar GuidedWorkflowPanel
- Mejorar PatchPanel
- Mostrar estados claros:
  - Waiting
  - Ready
  - Blocked
  - Failed
  - Passed
  - Needs approval
- Mejorar mensajes de error
- Mejorar botones según estado real
- Evitar botones activos cuando no corresponde
  Resultado esperado

El usuario debe entender siempre:

qué pasó
por qué pasó
qué falta
qué puede hacer ahora
qué está bloqueado
SESIÓN 98 — Project Onboarding Flow
Objetivo

Hacer que cargar un proyecto sea simple.

Flujo ideal

1. Elegir carpeta
2. Detectar stack
3. Crear sesión
4. Preparar workflow automáticamente
5. Mostrar resumen:
   - stack
   - scripts seguros
   - rutas detectadas
   - frontend/backend links
   - riesgos
     Implementar

- Mejorar project picker
- Mejorar prepare workflow
- Autoload de project intelligence
- Mejorar pantalla inicial
  Resultado esperado

Un usuario nuevo debe poder entrar y decir:

“quiero mejorar este proyecto”

y Zero debe preparar contexto útil.
