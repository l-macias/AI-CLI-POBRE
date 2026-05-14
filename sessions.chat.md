# Zero Runtime — Roadmap detallado de próximas sesiones

## Principio central

Zero Runtime debe ser un runtime de ejecución para agentes donde:

- el LLM propone;
- el runtime valida;
- el runtime decide;
- el runtime ejecuta;
- el runtime audita;
- el runtime recuerda;
- el runtime recupera contexto;
- el runtime controla costos;
- el runtime impone guardrails.

El modelo debe ser reemplazable: free, barato o premium según política, riesgo, presupuesto y necesidad.

---

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

SESIÓN 33 — Real Project Trial
Objetivo

Usar Zero Runtime en un proyecto real chico antes de documentar y pulir demasiado.

Flujo recomendado
inicializar runtime en repo real pequeño;
correr bootstrap;
cargar memoria;
pedir objetivo real;
generar plan;
validar plan;
aprobar;
ejecutar step;
revisar diff;
validar typecheck/lint/build si está permitido;
registrar limitaciones.
Resultado esperado

Detectar problemas reales de UX, arquitectura, prompts, retrieval, permisos, edición y validación.

Debe quedar un reporte:

.runtime/real-project-trial.md

Con:

objetivo probado;
plan generado;
steps ejecutadas;
bloqueos;
fallos;
costo aproximado;
mejoras necesarias.
Reglas
Usar proyecto chico.
No tocar producción.
No correr comandos destructivos.
No hacer git commit/push automático.
Confirmar cambios antes de escribir.
Test/reporte obligatorio al final.

SESIÓN 34 — Hardening + Security Review
Objetivo

Revisar seguridad antes de preparar el MVP público.

Revisar
path traversal
protected files
.env leakage
prompt injection local
retrieval poisoning
malicious package scripts
tool misuse
infinite loops
recursive recovery
context overflow
output overflow
unsafe generated code
provider failure modes
Implementar recomendado
RuntimePolicyTestSuite
SecurityRegressionTests
PromptInjectionFixtures
PathTraversalFixtures
ProtectedFileAccessTests
ToolMisuseTests
RetrievalPoisoningTests
Resultado esperado

Zero Runtime debe bloquear consistentemente:

lectura de secretos;
escritura fuera del proyecto;
comandos peligrosos;
loops infinitos;
reintentos no controlados;
contexto malicioso local;
tools no registradas;
permisos insuficientes.
Reglas
No relajar guardrails para pasar tests.
Si algo se bloquea, debe quedar auditado.
Toda regresión de seguridad debe tener test.
Test obligatorio al final.

SESIÓN 35 — Documentation + Developer Guide
Objetivo

Documentar bien el proyecto para que sea entendible y mantenible.

Implementar docs
docs/architecture.md
docs/runtime-flow.md
docs/agent-philosophy.md
docs/planning-system.md
docs/tool-system.md
docs/execution-system.md
docs/memory-system.md
docs/retrieval-system.md
docs/provider-strategy.md
docs/sandboxing.md
docs/security-model.md
docs/cli.md
docs/troubleshooting.md
Resultado esperado

Un desarrollador nuevo debe poder entender:

qué es Zero Runtime;
por qué el runtime manda;
cómo fluye una ejecución;
cómo se validan planes;
cómo se ejecutan tools;
cómo se recupera de fallos;
cómo se controla contexto;
cómo se controla costo/modelos;
qué límites tiene el MVP.
Reglas
Docs reales, no marketing vacío.
Incluir diagramas textuales si ayudan.
Documentar limitaciones.
Documentar decisiones de seguridad.
Mantener tono técnico y directo.
Test mínimo: revisar links/rutas mencionadas.

SESIÓN 36 — MVP Polish
Objetivo

Cerrar el MVP para que sea presentable y usable.

Hacer
limpiar ejemplos viejos;
ordenar scripts;
revisar nombres;
revisar logs;
README completo;
quickstart;
troubleshooting;
roadmap;
known limitations;
demo flow;
revisar DX de CLI;
revisar mensajes de error;
revisar estructura .runtime.
Resultado esperado

Zero Runtime debe sentirse como un proyecto serio, no como un conjunto de scripts.

Debe tener:

instalación clara;
primer uso claro;
ejemplo funcional;
errores comprensibles;
estructura coherente;
scripts limpios.
Reglas
No meter features nuevas grandes.
Priorizar estabilidad.
Priorizar claridad.
No romper tests existentes.
Correr test suite disponible.
Test obligatorio al final.

SESIÓN 37 — Release Candidate
Objetivo

Preparar versión inicial v0.1.0.

Hacer
tag v0.1.0
changelog
guía de instalación
ejemplos finales
known limitations
arquitectura congelada para MVP
checklist de seguridad
checklist de tests
checklist de docs
release notes
Resultado esperado

Zero Runtime v0.1.0 listo como primer release candidate.

Debe quedar claro:

qué hace;
qué no hace;
cómo se instala;
cómo se usa;
qué modelos soporta;
qué garantías ofrece;
qué sigue después.
Reglas
No agregar features nuevas en RC.
Solo fixes críticos.
Todos los tests principales deben pasar.
Documentar limitaciones honestamente.
No prometer capacidades no implementadas.
