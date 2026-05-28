# SESIÓN R1 — Robust LLM Output Contracts + Schema Compatibility Layer

## Objetivo

Fortalecer Zero Runtime contra cambios, inconsistencias o desviaciones en el formato de salida de los modelos LLM.

Actualmente Zero Runtime depende de schemas estrictos para validar propuestas del modelo. Eso es correcto y debe mantenerse, porque el runtime debe conservar autoridad. Pero necesitamos evitar que el sistema sea frágil ante outputs parcialmente válidos, markdown mezclado con JSON, diferencias entre providers, modelos menos obedientes o futuras versiones de schemas.

La solución no es relajar la validación. La solución es agregar una capa profesional de compatibilidad antes de la validación final.

---

## Principio central

Zero Runtime NO debe confiar en el output crudo del modelo.

Flujo deseado:

LLM raw output
↓
OutputExtractor
↓
SchemaVersionDetector
↓
ProposalNormalizer
↓
Strict Schema Validation
↓
Runtime Decision

El runtime puede tolerar variaciones de formato, pero nunca debe aplicar cambios sin validación estricta.

---

## Problema a resolver

Si el modelo devuelve algo como:

````json
{
  "changes": []
}

pero el runtime espera:

{
  "fileChanges": []
}

el sistema puede fallar aunque la intención sea válida.

También puede pasar que el modelo devuelva:

Aquí tienes la propuesta:

```json
{
  "schemaVersion": "patch-proposal.v1",
  "fileChanges": []
}

O que devuelva JSON incompleto, campos renombrados, texto adicional, arrays mal formados o propiedades desconocidas.

Zero Runtime debe poder:

- extraer estructura válida desde texto crudo;
- detectar versión de schema si existe;
- normalizar formatos conocidos;
- rechazar outputs ambiguos o inseguros;
- generar errores claros;
- preparar una futura repair loop;
- mantener validación estricta al final.

---

## Reglas obligatorias

- No usar `any`.
- No relajar los schemas finales.
- No aplicar propuestas inválidas.
- No interpretar creativamente outputs ambiguos.
- No inventar campos faltantes críticos.
- No permitir patches sin paths validados.
- No permitir comandos desde outputs no validados.
- No mezclar lógica de parsing con lógica de aplicación de patches.
- Todo debe ser modular, testeable y extensible.
- Mantener arquitectura provider-agnostic.
- El runtime sigue siendo la autoridad.

---

## Implementación recomendada

Crear una capa nueva, por ejemplo:

```txt
src/contracts/
├── LlmRawOutput.ts
├── StructuredOutputExtractor.ts
├── SchemaVersionDetector.ts
├── ProposalNormalizer.ts
├── ProposalNormalizationResult.ts
├── ContractValidationError.ts
├── RuntimeContractValidator.ts
└── index.ts

O, si encaja mejor con la estructura actual:

src/llm/contracts/
src/runtime/contracts/
src/proposals/contracts/

Antes de crear carpetas, revisar el tree real del proyecto.

Componentes esperados
1. LlmRawOutput

Representa el output crudo del modelo.

Debe guardar:

texto original;
provider;
model;
timestamp opcional;
metadata opcional;
origen de la solicitud.

Ejemplo conceptual:

export interface LlmRawOutput {
  readonly rawText: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly receivedAt: string;
}
2. StructuredOutputExtractor

Responsabilidad:

recibir texto crudo;
detectar JSON directo;
detectar bloque ```json;
detectar primer objeto JSON válido;
devolver resultado tipado;
no normalizar;
no validar schema final;
no inventar contenido.

Resultado esperado:

export type StructuredOutputExtractionResult =
  | {
      readonly status: "extracted";
      readonly value: unknown;
      readonly source: "raw_json" | "markdown_json_block" | "embedded_json";
    }
  | {
      readonly status: "failed";
      readonly reason: string;
    };
3. SchemaVersionDetector

Responsabilidad:

revisar el objeto extraído;
detectar schemaVersion;
permitir fallback controlado si no existe;
rechazar versiones desconocidas si no hay adapter.

Ejemplo:

export type KnownProposalSchemaVersion =
  | "patch-proposal.v1";

Más adelante podrá crecer a:

export type KnownProposalSchemaVersion =
  | "patch-proposal.v1"
  | "patch-proposal.v2"
  | "security-review.v1"
  | "verification-plan.v1";
4. ProposalNormalizer

Responsabilidad:

convertir variaciones conocidas hacia el contrato interno del runtime;
no hacer inferencias peligrosas;
no inventar paths;
no inventar comandos;
no rellenar cambios faltantes críticos.

Ejemplos permitidos:

changes -> fileChanges
reason -> rationale
summary -> objectiveSummary

Ejemplos NO permitidos:

path faltante -> inventar path
content faltante -> inventar contenido
command ambiguo -> asumir npm test
5. RuntimeContractValidator

Responsabilidad:

ejecutar extracción;
detectar versión;
normalizar;
validar contra schema estricto;
devolver resultado final seguro.

Flujo:

validateRawPatchProposal(raw)
↓
extract
↓
detect version
↓
normalize
↓
strict schema safeParse
↓
return accepted | rejected
Resultado esperado

Al final de la sesión debe existir una capa que permita esto:

const result = contractValidator.validatePatchProposal(rawOutput);

if (result.status === "accepted") {
  // recién acá el runtime puede seguir
}

if (result.status === "rejected") {
  // no se aplica nada
  // se informa error claro
}
Tests obligatorios

Crear tests o examples para cubrir:

Caso 1 — JSON válido directo

Input:

{
  "schemaVersion": "patch-proposal.v1",
  "objective": "Update file",
  "fileChanges": []
}

Resultado esperado:

accepted
Caso 2 — JSON dentro de markdown

Input:

Aquí tienes la propuesta:

```json
{
  "schemaVersion": "patch-proposal.v1",
  "objective": "Update file",
  "fileChanges": []
}

Resultado esperado:

```txt
accepted
Caso 3 — Alias conocido

Input:

{
  "schemaVersion": "patch-proposal.v1",
  "objective": "Update file",
  "changes": []
}

Resultado esperado:

accepted luego de normalizar changes -> fileChanges
Caso 4 — JSON inválido

Input:

{ "schemaVersion": "patch-proposal.v1",

Resultado esperado:

rejected
Caso 5 — Versión desconocida

Input:

{
  "schemaVersion": "patch-proposal.v999",
  "objective": "Update file",
  "fileChanges": []
}

Resultado esperado:

rejected
Caso 6 — Output ambiguo

Input:

Modifica el archivo principal y arregla el bug.

Resultado esperado:

rejected
Caso 7 — Campos peligrosos o no permitidos

Input con comandos, paths raros o campos inesperados si el schema no los permite.

Resultado esperado:

rejected o accepted solamente si el schema explícitamente lo permite
Integración con arquitectura existente

Antes de modificar código, la IA debe pedir archivos concretos.

Pedir primero:

tree actual del proyecto
package.json
tsconfig.json
archivo actual de PatchProposalSchema
archivo actual de PatchProposalParser
archivos relacionados a provider/fake LLM
tests/examples actuales de patch proposal

No debe suponer nombres exactos si no vio el proyecto.

Criterios de aceptación

La sesión se considera correcta si:

existe una capa separada para contratos de output LLM;
el output crudo no se valida directamente contra el schema final sin extracción/normalización previa;
los schemas estrictos siguen siendo la validación final;
hay errores claros y tipados;
hay tests para outputs válidos, markdown, alias conocidos, JSON inválido, versión desconocida y output ambiguo;
no se usa any;
no se aplican patches desde outputs inválidos;
el diseño queda listo para futura repair loop;
el diseño queda listo para múltiples providers/modelos.
Futuro relacionado

Esta sesión debe dejar preparado el terreno para una futura:

SESIÓN R2 — LLM Output Repair Loop

Donde, si el output no cumple contrato, el runtime pueda pedir al modelo una regeneración estricta del JSON, usando el error de validación como feedback, pero siempre volviendo a validar antes de aceptar.

También debe dejar preparado el terreno para:

SESIÓN R3 — Provider-Specific Output Adapters

Donde OpenRouter, OpenAI, Anthropic o modelos locales puedan tener adapters específicos sin contaminar el contrato interno del runtime.

Forma de trabajo esperada

Trabajar como venimos trabajando en Zero Runtime:

Respuestas cortas.
Poco texto.
Mucho código.
No suponer archivos.
Pedir archivos concretos.
Priorizar archivos completos listos para reemplazar.
Si el cambio es chico, indicar exactamente dónde va.
Mantener arquitectura limpia, modular y escalable.
TypeScript estricto.
Sin any.
Sin spaghetti code.
El runtime siempre conserva autoridad.

Mi recomendación: esta **R1** debería ir después de tener estable el provider real + patch proposal + UI básica de aprobación, pero antes de automatizar demasiado los agentes. Es una sesión de hardening estructural importante.
````

SESIÓN R4 — Live Runtime Event Streaming to UI Timeline

Objetivo:

Conectar todos los pasos internos del runtime/agente con SessionEventStream/WebSocketGateway
para que el EventTimeline de la UI se actualice en tiempo real.

Resultado esperado:

El usuario nunca debe sentir que Zero Runtime está “pensando en silencio”.
Cada acción relevante debe aparecer inmediatamente en la UI.
