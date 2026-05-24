FASE 10 — UX real tipo plataforma
SESIÓN 91 — Pending Approval Center

Objetivo: centralizar aprobaciones en un solo lugar.

Implementar recomendado:

src/approval/
├── ApprovalRequest.ts
├── ApprovalRequestStore.ts
├── ApprovalPolicy.ts
├── ApprovalDecisionRecorder.ts
└── ApprovalRequestBuilder.ts

UI:

ui/src/components/approval/
├── ApprovalCenter.tsx
├── ApprovalRequestCard.tsx
├── PlanApprovalCard.tsx
├── PatchApprovalCard.tsx
├── VerifyApprovalCard.tsx
├── RiskApprovalCard.tsx
└── RollbackApprovalCard.tsx

Debe manejar:

approve plan
approve patch
approve verify
approve dirty working tree
approve rollback
reject
ask revision
approve selected files

Resultado esperado:

Las aprobaciones dejan de estar repartidas.
Zero muestra todo lo que requiere intervención humana en un centro único.
SESIÓN 92 — Session Memory UI

Objetivo: ver y editar decisiones activas de la sesión.

Backend/runtime si falta:

src/interactive/SessionDecision.ts
src/interactive/SessionDecisionStore.ts
src/interactive/DecisionConflictDetector.ts
src/interactive/DecisionApplier.ts

UI:

ui/src/components/memory/
├── DecisionMemoryPanel.tsx
├── DecisionCard.tsx
├── DecisionConflictPanel.tsx
└── AppliedContextViewer.tsx

Mostrar:

no tocar backend
usar local_snapshot
no usar any
no tocar database
permitir package.json solo con aprobación
conflictos activos
reglas aplicadas al contexto

Resultado esperado:

El usuario puede ver qué reglas/decisiones están afectando al runtime.
SESIÓN 93 — Context Graph UI

Objetivo: visualizar relaciones reales frontend/backend.

UI:

ui/src/components/context-graph/
├── ContextGraph.tsx
├── ContextNode.tsx
├── ContextEdge.tsx
├── EndpointRelationshipGraph.tsx
└── ContextGraphLegend.tsx

Ejemplo visual:

ProfileEditForm.tsx
-> profileApi.ts
-> POST /api/profile
-> profileRoutes.ts
-> authMiddleware.ts
-> profileController.ts

Resultado esperado:

Zero se siente más moderno y útil para entender proyectos MERN/PERN.
FASE 11 — Persistencia y continuidad
SESIÓN 94 — Runtime Artifact Store

Objetivo: unificar almacenamiento de artefactos por sesión.

Implementar:

src/artifacts/
├── RuntimeArtifact.ts
├── RuntimeArtifactStore.ts
├── RuntimeArtifactIndex.ts
├── RuntimeArtifactReader.ts
└── RuntimeArtifactWriter.ts

Artefactos:

runtime_plan
patch_proposal
diff_preview
apply_result
rollback_result
snapshot
verify_result
report

Resultado esperado:

Cada sesión puede recuperar su último plan, patch, diff, apply, rollback y report.
SESIÓN 95 — Resume Session / Restore UI State

Objetivo: poder cerrar y abrir la UI sin perder el estado.

Endpoints:

GET /api/sessions/:id/artifacts
GET /api/sessions/:id/workflow-state
POST /api/sessions/:id/resume

UI:

restaurar runtimePlan
restaurar patchProposal
restaurar patchDiff
restaurar applyResult
restaurar rollbackResult
restaurar reportExport
recalcular Guided Workflow

Resultado esperado:

Zero puede continuar una sesión previa donde quedó.
SESIÓN 96 — Project Dashboard

Objetivo: pantalla inicial útil para uso diario.

UI:

ui/src/pages/ProjectDashboardPage.tsx
ui/src/components/dashboard/
├── ProjectDashboard.tsx
├── RecentProjectCard.tsx
├── RecentSessionCard.tsx
├── ProviderStatusWidget.tsx
├── SnapshotStatusWidget.tsx
├── RecentReportsWidget.tsx
└── RecommendedActionsWidget.tsx

Mostrar:

proyectos recientes
última sesión
estado provider
último plan
último patch
último apply
último rollback
reports recientes
snapshots recientes
acciones recomendadas
SESIÓN 97 — Reports Browser

Objetivo: ver reportes desde UI.

UI:

ui/src/pages/ReportsPage.tsx
ui/src/components/reports/
├── ReportsBrowser.tsx
├── ReportCard.tsx
├── ReportViewer.tsx
├── ReportDiffSummary.tsx
└── ReportTimelineSummary.tsx

Backend si falta:

src/reports/ReportIndex.ts
src/reports/ReportReader.ts

Resultado esperado:

El usuario puede revisar reportes sin abrir archivos manualmente.
FASE 12 — Provider real para edición
SESIÓN 98 — Provider Patch Bridge

Objetivo: permitir que el provider proponga patches reales, no solo planes.

Implementar:

src/patches/provider/
├── RuntimePatchProviderBridge.ts
├── PatchProviderSchema.ts
├── PatchProviderPromptBuilder.ts
├── PatchProviderSanitizer.ts
└── PatchProviderResponseParser.ts

Flujo:

Runtime Plan validado

- Context Pack seguro
  -> provider propone patch JSON
  -> runtime valida schema
  -> PatchProposalValidator
  -> Diff Preview
  -> Approval
  -> Apply controlado

Regla central:

LLM propone.
Runtime valida.
Runtime decide.
Usuario aprueba.
SESIÓN 99 — Context Pack Builder

Objetivo: construir contexto seguro antes de llamar al provider.

Implementar:

src/context-pack/
├── ContextPack.ts
├── ContextPackBuilder.ts
├── ContextFileReader.ts
├── ContextBudgetManager.ts
├── SecretRedactor.ts
├── ContextRiskScanner.ts
└── ContextPackReporter.ts

Debe incluir:

archivos candidatos
rutas relacionadas
stack detectado
API map
frontend/backend links
decisiones de sesión
restricciones activas
plan actual
sin secrets
sin .env
límite de tokens

Resultado esperado:

OpenRouter/provider recibe contexto útil, acotado y seguro.
SESIÓN 100 — Provider Patch E2E

Objetivo: probar flujo completo con provider fake y OpenRouter opcional.

Test:

plan
context pack
provider patch proposal
validation
diff
dry-run
apply
rollback
report

Reglas:

si no hay OPENROUTER_API_KEY -> skipped
si hay key -> smoke test real
runtime nunca aplica sin aprobación
FASE 13 — Verificación y reporte profesional
SESIÓN 101 — Post Apply Verify Workflow

Objetivo: después de apply, sugerir/verificar comandos seguros.

Implementar:

src/verify/
├── PostApplyVerifyPlanner.ts
├── PostApplyVerifyWorkflow.ts
├── VerifyResultStore.ts
└── VerifyResultSummarizer.ts

Flujo:

apply ok
-> sugerir npm run typecheck
-> sugerir npm run build si existe
-> ejecutar solo con aprobación
-> guardar resultado
SESIÓN 102 — Full Workflow Report Upgrade

Objetivo: reportes completos de flujo.

Implementar:

src/reports/
├── WorkflowReportBuilder.ts
├── PatchWorkflowReportSection.ts
├── SecurityWorkflowReportSection.ts
├── ProviderWorkflowReportSection.ts
├── VerifyWorkflowReportSection.ts
└── RollbackWorkflowReportSection.ts

Debe incluir:

plan
provider usado
patch proposal
diff summary
snapshot
dry-run result
apply result
rollback result
verify result
archivos tocados
backups
riesgos
decisiones
acciones bloqueadas
timeline
SESIÓN 103 — Visual Workflow Timeline Upgrade

Objetivo: timeline más profesional.

UI:

ui/src/components/workflow-timeline/
├── WorkflowTimeline.tsx
├── WorkflowTimelineStep.tsx
├── WorkflowTimelineEventCard.tsx
├── WorkflowBlockedEvent.tsx
├── WorkflowApplyEvent.tsx
└── WorkflowRollbackEvent.tsx

Mostrar:

Project loaded
Workflow prepared
Plan generated
Patch proposed
Diff preview generated
Snapshot created
Dry-run completed
Patch applied
Rollback available/completed
Verify completed
Report exported
FASE 14 — Hardening y MVP público/técnico
SESIÓN 104 — Security Hardening Pass

Objetivo: auditar seguridad antes de seguir creciendo.

Checklist:

protected paths
.env leakage
path traversal
dangerous deletes
dirty working tree
snapshot requirement
high risk apply block
provider prompt injection
context poisoning
secret redaction
backup integrity
rollback integrity
SESIÓN 105 — Code Quality Hardening

Objetivo: limpieza técnica.

Checklist:

no any
strict TypeScript
imports muertos
helpers duplicados
errores legibles
tipos compartidos
nombres consistentes
scripts ordenados
tests agrupados
SESIÓN 106 — MVP Daily Use Test

Objetivo: probar Zero en un proyecto real MERN/PERN.

Flujo:

abrir proyecto real
prepare workflow
plan
provider plan
patch proposal
provider patch si ya existe
diff
snapshot
dry-run
apply
verify
rollback si hace falta
report
resume session

Resultado esperado:

Validar si Zero ya sirve para uso diario técnico.
FASE 15 — Producto avanzado
SESIÓN 107 — GitHub Integration Base
detectar repo
branch actual
working tree status
crear branch segura
preparar commit
preparar PR futuro
SESIÓN 108 — Pull Request Proposal Flow
patch aplicado
verify ok
crear branch
commit
generar PR draft
reportar cambios
SESIÓN 109 — Settings Pro
provider
modelo
workspace mode
protected paths
approval behavior
GitHub
verify commands
high-risk policy
SESIÓN 110 — Project Creation Mode
crear proyecto desde cero
sugerir arquitectura
generar estructura inicial
planificar módulos
scaffold controlado
apply por aprobación
SESIÓN 111 — RAG/Knowledge Integration Design

Probablemente convenga como proyecto separado, pero Zero puede integrarlo después.

embeddings
vector store
project knowledge base
business docs
chatbots
external docs
Recomendación de orden inmediato

Yo seguiría así:

91 — Pending Approval Center
92 — Session Memory UI
93 — Context Graph UI
94 — Runtime Artifact Store
95 — Resume Session
96 — Project Dashboard
97 — Reports Browser
98 — Provider Patch Bridge
99 — Context Pack Builder
100 — Provider Patch E2E
