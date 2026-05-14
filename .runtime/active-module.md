# Active Module

## Módulo activo

Provider Strategy + Budget Integration

## Sesión actual

SESIÓN 28 — Provider Strategy + Budget Integration

## Estado

Pendiente.

## Objetivo

Integrar Provider Strategy y Model Budget Controller al runtime real.

## Contexto

Provider Strategy y Model Budget Controller ya existen y pasan tests aislados.

Importante:

- El catálogo de precios/modelos todavía está hardcodeado.
- `openai/gpt-5-premium` es ficticio y solo sirve para tests.
- Antes de producción, mover configuración a `.runtime`.

## Restricciones

- No premium sin aprobación.
- Toda selección debe auditarse.
- Todo costo debe estimarse o declararse desconocido.
- No network tools extra.
- No usar `any`.
- Test obligatorio.
