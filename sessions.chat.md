Roadmap actualizado — Zero Runtime hacia una herramienta confiable de uso diario
Contexto general del proyecto

ROADMAP RECOMENDADO DESDE AHORA
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

SESIÓN 96.N — Provider Context File Selection
Objetivo

Mejorar qué archivos se mandan al provider.

Aunque ya hay resolver de candidatos, debe ser más inteligente.

Implementar
src/context/
├── PatchContextSelector.ts
├── ProjectFileRanker.ts
├── IntentToFileMatcher.ts
Debe considerar

- objetivo del usuario
- stack detectado
- rutas frontend/backend
- archivos conocidos
- nombres semánticos
- imports
- tamaño de archivo
- paths sensibles
  Ejemplo

Si el usuario pide:

“mejorar hero de la landing”

Debe priorizar:

src/components/sections/Hero.tsx
src/app/page.tsx
src/styles/globals.css

No pasar 20 archivos al provider.

Resultado esperado

El provider recibe menos archivos, pero mejores.

SESIÓN 96.O — Provider Patch Quality Guard
Objetivo

Evitar patches malos aunque pasen schema.

Un patch puede ser JSON válido pero malo: demasiado grande, cambia demasiado, borra contenido, reescribe todo sin razón, etc.

Implementar
src/patches/
├── PatchQualityGuard.ts
├── PatchContentHeuristics.ts
Validaciones

- demasiadas líneas agregadas
- demasiadas líneas eliminadas
- cambia más del 60% de un archivo
- elimina imports críticos
- elimina exports
- convierte server/client component sin razón
- toca contenido fuera del objetivo
- añade dependencias no permitidas
  Resultado esperado

Zero puede bloquear:

Patch rejected:

- Too many unrelated changes.
- Rewrites entire file without sufficient reason.
- Removes existing exported component.
  ROADMAP POSTERIOR — Para MVP público confiable
  SESIÓN 97 — Reports Browser
  Objetivo

Tener una pantalla para navegar reportes pasados.

Debe mostrar

- sesiones
- planes
- patches
- verification reports
- apply reports
- rollback reports
  SESIÓN 98 — Provider Patch Bridge v2
  Objetivo

Mejorar provider patch con recovery, quality guard y file-level approval ya integrados.

SESIÓN 99 — Context Pack Builder
Objetivo

Crear paquetes de contexto controlados para provider.

Debe incluir:

- archivos relevantes
- summaries
- constraints
- project memory
- session decisions
- protected paths
- allowed commands

Nunca incluir secretos.

SESIÓN 100 — Hardening MVP
Objetivo

Auditoría general antes de usarlo en serio o mostrarlo públicamente.

Revisar:

- protected paths
- .env leakage
- provider prompts
- patch apply gates
- rollback
- sandbox
- verify commands
- approval bypass
- path traversal
- absolute paths
- JSON parsing
- provider malformed output
- memory poisoning
  Flujo ideal final de usuario

El flujo diario debería verse así:

1. Dashboard
2. Select project
3. Start session
4. Prepare Workflow
5. Generate Provider Plan
6. Review Plan
7. Generate Provider Patch Proposal
8. Review files one by one
9. Approve selected files
10. Create sandbox/snapshot
11. Run sandbox verification
12. If fails:
    - rollback sandbox
    - request provider fix
13. If passes:
    - approve real apply
14. Runtime applies with backup
15. Runtime verifies again
16. Export report
17. Rollback available
    Prioridad real recomendada

Si queremos que Zero se vuelva útil y confiable rápido, el orden más importante es:

1. 96.E — File-Level Patch Review + Selective Approval
2. 96.F — Selective Patch Apply
3. 96.H — Patch Verification Sandbox
4. 96.I — Failed Patch Recovery Loop
5. 96.J — Patch Diff Viewer Layout Fix
6. 96.O — Patch Quality Guard
7. 96.L — Visual Preview Foundation
8. 97 — Reports Browser
9. 100 — Hardening MVP

El punto clave es este:

Antes de agregar más features, hay que convertir los patches en algo revisable, aprobable, verificable y reversible.

Ahí Zero empieza a diferenciarse de Cursor, Claude Code o cualquier agente libre: no por “hacer más magia”, sino por hacer cambios con control, evidencia, validación y confianza.
