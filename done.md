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
