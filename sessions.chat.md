Roadmap final corregido recomendado

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
  SESIÓN 51 — Public MVP Packaging

Objetivo: preparar el proyecto para mostrarlo o compartirlo.

51.A — README public polish

- pitch claro
- features
- quickstart
- seguridad
- filosofía runtime-authority
- ejemplos CLI
  51.B — Demo script / walkthrough
- comandos de demo
- expected output resumido
- explicación de qué demuestra
  51.C — Known limitations
- provider real opcional
- no auto-approve
- scaffold básico
- agent loop técnico
- docs todavía MVP
- no marketplace/npm public todavía si no se decide
  51.D — Changelog inicial
- crear CHANGELOG.md
- v0.1.0
- features
- security model
- tests/gates
- limitations

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
  SESIÓN 53 — Runtime Intelligence Upgrade

Objetivo: mejorar capacidad real sin romper la autoridad del runtime.

53.A — Code intelligence stronger

- import graph más útil
- related files resolver
- symbol scanner mejorado
- target expansion controlado
  53.B — Repair context smarter
- incluir archivos relacionados
- limitar tokens
- explicar por qué se eligió contexto
- evitar retrieval poisoning
  53.C — Patch quality evaluator
- evaluar patch antes de aplicar
- detectar cambios innecesarios
- detectar riesgo arquitectónico
- detectar edits fuera de objetivo
  SESIÓN 54 — Provider Strategy v2

Objetivo: hacer provider layer más escalable.

54.A — Provider profiles

- free
- cheap
- strong
- local
- premium
  54.B — Model routing policy
- elegir modelo por tarea
- presupuesto
- riesgo
- tamaño de contexto
- necesidad de precisión
  54.C — Provider fallback
- fallback seguro
- no fallback premium sin aprobación
- registrar decisión
  SESIÓN 55 — Local Memory / Project Knowledge v2

Objetivo: que la memoria sea más útil sin volverse peligrosa.

55.A — Memory review command

- zero memory list
- zero memory inspect
- zero memory clear
  55.B — Memory trust levels
- user-approved
- runtime-generated
- provider-suggested
- quarantined
  55.C — Memory poisoning defense upgrade
- detectar instrucciones maliciosas
- bloquear reglas peligrosas
- auditar origen
