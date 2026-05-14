Roadmap sugerido de sesiones restantes para Zero Runtime

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

SESIÓN 24 — Code Intelligence Layer
Objetivo:

- Mejorar edición de código con estructura.

Implementar:

- ImportGraph
- FileRelationshipMap
- ASTEditTool base
- ImportEditorTool
- TypeErrorAnalyzerTool

Resultado:

- El agente entiende relaciones entre archivos antes de editar.

SESIÓN 25 — Git + Checkpoint Integration
Objetivo:

- Agregar seguridad con git.

Implementar:

- GitStatusTool
- GitDiffTool
- GitCheckpointTool
- GitRestoreTool
- checkpoint antes de cambios grandes

Resultado:

- Cada cambio importante puede auditarse y revertirse.

SESIÓN 26 — Observability + Runtime Metrics
Objetivo:

- Hacer el runtime observable.

Implementar:

- RuntimeTracer
- MetricsCollector
- ExecutionTimeline
- TokenUsageTracker
- PerformanceProfiler
- ErrorReporter

Resultado:

- Se puede auditar qué hizo el runtime y por qué.

SESIÓN 27 — Sandbox Policy
Objetivo:

- Preparar aislamiento de ejecución.

Implementar:

- SandboxPolicy
- FileIsolation
- CommandIsolation
- ResourceLimiter
- SandboxManager base

Resultado:

- Base para ejecutar con aislamiento fuerte.

SESIÓN 28 — CLI v1
Objetivo:

- Usar Zero Runtime desde terminal.

Implementar:

- CLI entrypoint
- zero-runtime init
- zero-runtime objective
- zero-runtime plan
- zero-runtime run
- zero-runtime status
- zero-runtime restore

Resultado:

- Primer producto usable desde consola.

SESIÓN 29 — Project Bootstrapper
Objetivo:

- Que Zero Runtime pueda inicializarse en cualquier repo.

Implementar:

- .runtime bootstrap
- bootstrap.md
- runtime-rules.md
- provider-rules.md
- coding-conventions.md

Resultado:

- Se puede instalar/inicializar en proyectos reales.

SESIÓN 30 — End-to-End Benchmark Projects
Objetivo:

- Probar el agente en escenarios reales.

Benchmarks:

- TypeScript error fix
- ESLint fix
- React refactor
- Next.js build issue
- Jest failing test
- package migration pequeña

Resultado:

- Medimos confiabilidad real.

SESIÓN 31 — Hardening + Security Review
Objetivo:

- Revisar seguridad y diseño.

Revisar:

- comandos peligrosos
- path traversal
- protected files
- env leakage
- prompt injection local
- tool misuse
- infinite loops
- context overflow

Resultado:

- Runtime más seguro antes de usarlo en proyectos reales.

SESIÓN 32 — Documentation + Developer Guide
Objetivo:

- Documentar bien el proyecto.

Implementar docs:

- architecture.md
- runtime-flow.md
- planning-system.md
- validation-system.md
- tool-system.md
- memory-system.md
- sandboxing.md
- agent-philosophy.md

Resultado:

- Proyecto entendible y mantenible.

SESIÓN 33 — MVP Polish
Objetivo:

- Cerrar MVP.

Hacer:

- limpiar ejemplos
- mejorar scripts
- revisar nombres
- revisar logs
- README completo
- quickstart
- troubleshooting
- roadmap

Resultado:

- MVP presentable.

SESIÓN 34 — Real Project Trial
Objetivo:

- Usarlo en un proyecto real chico.

Flujo:

- inicializar runtime
- pedir objetivo real
- generar plan
- validar
- ejecutar
- revisar diff
- validar build/lint

Resultado:

- Validación práctica del producto.

SESIÓN 35 — Premium Provider Strategy
Objetivo:

- Preparar soporte multi-provider serio.

Implementar:

- provider roles
- plannerModel
- coderModel
- reviewerModel
- fallback chain
- model capabilities extendido
- costo estimado por ejecución

Resultado:

- Soporte real para modelos free y premium.

SESIÓN 36 — Release Candidate
Objetivo:

- Preparar versión inicial.

Hacer:

- tag v0.1.0
- changelog
- guía de instalación
- ejemplos
- known limitations
- arquitectura congelada para MVP

Resultado:

- Zero Runtime v0.1.0 listo.
