SESIÓN 99 — Provider Settings + Model Selection Polish
Objetivo

Que OpenRouter/provider sea usable desde UI.

Implementar

- Mostrar provider activo
- Mostrar API key configured/missing
- Elegir modelo
- Mostrar modelos recomendados
- Mostrar fallback model
- Guardar settings
- Mostrar errores del provider de forma clara
  Resultado esperado

El usuario puede usar:

OpenRouter
modelo free
modelo premium
fallback local/mock

sin tocar código.

SESIÓN 100 — Real Project Trial
Objetivo

Probar Zero con un proyecto real tuyo.

Idealmente:

- un proyecto React/Node chico
- sin base de datos crítica
- con TypeScript
- con npm run typecheck
  Flujo

1. cargar proyecto real
2. analizar stack
3. pedir mejora pequeña
4. generar plan
5. generar patch
6. revisar diff
7. sandbox
8. apply
9. report
   Resultado esperado

Validar si Zero ya sirve en uso diario para cambios chicos/medianos.

MVP Definition

El MVP queda terminado cuando Zero pueda hacer esto de forma fluida:

1. Cargar un proyecto local
2. Detectar stack y contexto
3. Generar plan validado
4. Generar patch proposal
5. Mostrar diff revisable
6. Permitir approval por archivo
7. Ejecutar sandbox verification
8. Si falla, generar recovery y repaired patch
9. Si pasa, permitir apply real
10. Exportar reporte auditable
    Qué NO meter todavía en MVP

Para no atrasarlo:

- RAG/embeddings
- creación completa de apps desde cero avanzada
- GitHub PR completo
- multi-agent complejo
- base de datos sandbox real
- despliegue cloud
- marketplace de providers

Eso puede ser roadmap post-MVP.

Roadmap post-MVP recomendado
Post-MVP 1 — GitHub PR Mode

- Crear branch
- aplicar patch
- commit
- PR draft
- reporte en PR
  Post-MVP 2 — Database-aware Sandbox
- detectar Prisma/Mongoose/Postgres
- bloquear migraciones peligrosas
- usar DB temporal
- rollback DB
  Post-MVP 3 — App From Scratch Mode
- proponer arquitectura
- generar scaffold
- crear módulos
- verificar build
- iterar con runtime
  Post-MVP 4 — RAG / Knowledge Projects
- embeddings
- documentos externos
- chatbot empresarial
- análisis de negocio
  Post-MVP 5 — Multi-provider Intelligence
- modelos baratos para plan
- modelos mejores para patch
- fallback automático
- costo/token tracking
