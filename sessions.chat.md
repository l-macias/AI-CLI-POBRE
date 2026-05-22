FASE 9 — Plan real + patch real
SESIÓN 83 — Runtime Plan Generator

Objetivo: convertir una instrucción del usuario en un plan estructurado real.

Implementar:

src/planning/
├── RuntimePlan.ts
├── RuntimePlanGenerator.ts
├── PlanPolicyValidator.ts
├── PlanRiskAnalyzer.ts
└── PlanStorage.ts

Debe generar:

- objetivo
- alcance
- archivos candidatos
- pasos
- riesgos
- comandos verify sugeridos
- necesita snapshot sí/no
- requiere approval sí/no

Regla:

LLM puede proponer, runtime valida.
SESIÓN 84 — LLM Provider Bridge para Plan

Objetivo: usar OpenRouter para generar planes, pero con salida estructurada validada.

Implementar:

src/providers/
├── LlmProvider.ts
├── OpenRouterProvider.ts
├── ProviderRequestPolicy.ts
├── ProviderResponseValidator.ts
└── ProviderUsageTracker.ts

Reglas:

- no mandar .env
- no mandar archivos protegidos
- no aceptar texto libre como decisión final
- validar JSON/schema
- registrar modelo, tokens/costo si está disponible

Resultado:

Zero usa OpenRouter para proponer planes, no para decidir.
SESIÓN 85 — Patch Proposal Generator

Objetivo: generar una propuesta de patch controlada.

Implementar:

src/patches/
├── PatchProposal.ts
├── PatchProposalGenerator.ts
├── PatchProposalValidator.ts
├── PatchFileChange.ts
├── PatchRiskAnalyzer.ts
└── PatchStorage.ts

Formato:

{
"summary": "...",
"files": [
{
"path": "src/...",
"operation": "modify|create|delete",
"beforeHash": "...",
"content": "..."
}
],
"risks": [],
"verifyCommands": []
}

Regla:

No aplicar nada todavía.
SESIÓN 86 — Diff Builder real

Objetivo: convertir patch proposal en diff visual real para UI.

Implementar:

src/patches/
├── UnifiedDiffBuilder.ts
├── FileDiffBuilder.ts
├── DiffLineClassifier.ts
└── PatchPreviewBuilder.ts

Conectar con:

ui/src/components/patch/PatchDiffViewer.tsx

Resultado:

El usuario ve cambios reales antes de aprobar.
SESIÓN 87 — Apply Orchestrator seguro

Objetivo: aplicar patch solo con aprobación + snapshot + validaciones.

Implementar:

src/apply/
├── ApplyOrchestrator.ts
├── ApplyPolicy.ts
├── ProtectedPathGuard.ts
├── SnapshotRequiredGuard.ts
├── PatchApplyService.ts
└── ApplyResultStore.ts

Flujo:

1. validar approval
2. validar paths protegidos
3. validar snapshot
4. aplicar cambios
5. capturar after
6. registrar diff
7. sugerir verify

Reglas:

- no tocar .env
- no tocar node_modules
- no delete riesgoso sin hard approval
- no apply si high risk y settings lo bloquea
  FASE 10 — UX real tipo plataforma
  SESIÓN 88 — Guided Workflow UI

Objetivo: que la UI guíe al usuario paso a paso.

Componentes:

WorkflowStepper.tsx
WorkflowStepCard.tsx
WorkflowProgressHeader.tsx
NextBestActionPanel.tsx

Pasos:

Project
Session
Prepare Workflow
Questions
Plan
Patch
Snapshot
Approval
Apply
Verify
Report

Resultado:

Zero deja de ser una colección de paneles y se vuelve flujo guiado.
SESIÓN 89 — Pending Approval Center

Objetivo: centralizar todas las aprobaciones.

Componentes:

ApprovalCenter.tsx
ApprovalRequestCard.tsx
VerifyApprovalCard.tsx
PatchApprovalCard.tsx
RiskApprovalCard.tsx

Debe manejar:

- approve plan
- approve verify
- approve patch
- reject
- ask revision
- approve only selected files
  SESIÓN 90 — Session Memory UI

Objetivo: ver y editar decisiones activas.

Componentes:

DecisionMemoryPanel.tsx
DecisionCard.tsx
DecisionConflictPanel.tsx
AppliedContextViewer.tsx

Mostrar:

- no tocar backend
- usar local_snapshot
- no usar any
- permitir package.json solo con aprobación
- conflictos activos

Esto va a ser muy valioso visualmente.

SESIÓN 91 — Context Graph UI

Objetivo: mostrar relaciones entre frontend/backend.

Componentes:

ContextGraph.tsx
ContextNode.tsx
ContextEdge.tsx
EndpointRelationshipGraph.tsx

Ejemplo:

ProfileEditForm.tsx
-> profileApi.ts
-> POST /api/profile
-> profileRoutes.ts
-> authMiddleware.ts
-> profileController.ts

Esto haría que el producto se sienta muy moderno.

FASE 11 — Producto usable diariamente
SESIÓN 92 — Project Dashboard

Objetivo: pantalla inicial útil.

Mostrar:

- proyectos recientes
- última sesión
- estado provider
- errores recientes
- reports recientes
- snapshots recientes
- acciones recomendadas
  SESIÓN 93 — Reports Browser

Objetivo: ver reportes desde UI, no solo exportarlos.

Componentes:

ReportsPage.tsx
ReportCard.tsx
ReportViewer.tsx
ReportDiffSummary.tsx
SESIÓN 94 — Snapshot Manager UI

Objetivo: administrar rollback.

Componentes:

SnapshotManager.tsx
SnapshotCard.tsx
SnapshotDiffViewer.tsx
RestoreSnapshotDialog.tsx

Acciones:

- ver snapshot
- ver archivos afectados
- ver diff before/after
- restaurar snapshot
  SESIÓN 95 — Verify Results UI avanzada

Objetivo: mostrar build/lint/typecheck de forma clara.

Componentes:

VerifyRunTimeline.tsx
VerifyOutputViewer.tsx
VerifyIssueParser.tsx
VerifyCommandSelector.tsx
FASE 12 — Calidad, seguridad y MVP
SESIÓN 96 — Runtime Settings Enforcement

Objetivo: que settings gobiernen el runtime real.

Aplicar:

- protectedPaths
- requireSnapshotBeforeApply
- requireApprovalForVerify
- blockHighRiskApply
- provider/model
- allowPaidModels
- default workspace mode
  SESIÓN 97 — Security Regression Suite Final

Objetivo: testear seguridad antes de MVP.

Casos:

- prompt injection
- path traversal
- protected path write
- .env leakage
- unsafe verify command
- unsafe patch delete
- provider sends protected content
- apply without snapshot
  SESIÓN 98 — MVP Polish

Objetivo: que se vea como producto serio.

Pulir:

- navegación
- empty states
- loaders
- errores legibles
- diseño responsive
- onboarding
- copywriting
- botones principales
