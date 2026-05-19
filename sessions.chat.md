Roadmap final corregido recomendado

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
