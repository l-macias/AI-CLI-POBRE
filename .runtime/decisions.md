## 005 - Provider isolation

The runtime must not call OpenRouter directly. All model access goes through the Provider interface.

## 006 - No automatic provider call on startup

The development entrypoint initializes the provider layer but does not call the API automatically. This avoids failing local startup when no API key is configured.

## 007 - Native fetch

The project uses Node.js native fetch instead of adding an HTTP client dependency.

## 008 - Runtime state is persisted as markdown first

The first persistence layer uses human-readable markdown files before introducing JSON checkpoints or database-backed memory.

## decision-010 - Persist only accepted plans

Plans must only be persisted after passing the full runtime-controlled acceptance flow:

1. Provider response received.
2. Structured JSON parsed.
3. Zod schema validation passed.
4. Plan optimized.
5. PlanValidator passed.
6. Architecture path guardrails passed.
7. Runtime accepted the plan.

Rejected, malformed, non-canonical, or provider-failed plans must never be written to `.runtime/active-plan.json`.

## decision-011 - Retry policy is runtime-owned

Plan generation retry behavior is owned by the runtime, not by the model.

The runtime classifies failures before deciding whether to retry.

Recoverable failures include invalid JSON, invalid schema output, and empty provider responses.

Non-retryable failures include provider authentication errors, payment errors, forbidden access, missing models, and rate limits.

The model may only retry when the runtime explicitly allows another attempt.

## decision-012 - No fallback model yet

Automatic model fallback is intentionally deferred.

Session 11 implements retry/rejection policy, not model routing.

Fallback model selection may be added later, but it must remain runtime-controlled and deterministic.

## decision-013 - Valid plans are not executable by default

A generated plan that passes schema validation, runtime validation, and architecture validation receives status `validated`.

A `validated` plan is not automatically executable.

The runtime must explicitly approve the plan before it can become `ready_for_execution`.

Allowed lifecycle:

generated -> validated -> approved -> ready_for_execution

Rejected lifecycle:

generated -> rejected
validated -> rejected

Invalid transition confirmed:

validated -> ready_for_execution

## decision-014 - Validation pipeline exists before command execution

Validation contracts and orchestration must exist before tools or command execution are introduced.

Session 13 intentionally registers TypeScript, lint, and build validators without executing their commands.

This keeps validation runtime-owned and avoids introducing implicit tool execution.

Command execution may only be added later through an explicit runtime-controlled execution contract.

## decision-015 - Tools are intents before execution

Tools are not executable by default.

A model may only propose a tool intent.

The runtime must validate:

1. tool registration
2. request schema
3. tool input schema
4. permissions

before any future execution can happen.

Session 14 intentionally introduced contract-only placeholder tools and no filesystem implementation.

## decision-016 - Guardrails must exist before real tools

Real tools must not be implemented before the runtime has a dedicated guardrail layer.

All future tool execution must pass through runtime-owned guardrails before any file, command, network, or git action can occur.

Session 15 introduced:

- permission validation
- protected file blocking
- dangerous command blocking
- token limit protection
- context overflow protection

The model remains unable to execute tools directly.

## decision-017 - Read-only tools require full runtime guardrails

Read-only filesystem tools may execute only after passing:

1. ToolRegistry lookup
2. ToolExecutionValidator schema validation
3. ToolPermissionPolicy validation
4. ToolPermissionManager guardrails
5. Project root path resolution
6. Protected file blocking

Even read-only tools must not bypass runtime guardrails.

Protected paths remain blocked before execution.

## decision-018 - Writes require explicit runtime control

Filesystem writes are allowed only through runtime-owned write tools.

Write tools must pass:

1. ToolRegistry lookup
2. ToolExecutionValidator schema validation
3. ToolPermissionPolicy validation
4. ToolPermissionManager guardrails
5. Project root path resolution
6. Protected file blocking

Edits require `diffConfirmed: true`.

Edits must create a backup before writing.

Restore operations must create a pre-restore backup before replacing content.

Protected files remain blocked before execution.

Terminal commands and git operations remain unavailable.

## Session 18 — Runtime Tool Execution Gate + Plan Step Mapping

### Decision: execution requires ready_for_execution

Only plans with `activePlanReview.status === "ready_for_execution"` may execute tools.

Rejected statuses:

- `generated`
- `validated`
- `rejected`
- `approved`

Reason:
A valid or approved plan is not automatically executable. Execution requires an explicit runtime transition.

### Decision: model proposes, runtime executes

Plan steps may include `toolIntent`, but the model does not execute tools.

The runtime:

1. checks the active plan review status,
2. checks the step exists,
3. blocks forbidden step types,
4. maps the step to a `ToolExecutionRequest`,
5. validates the request,
6. checks permissions and guardrails,
7. executes through `ToolRuntimeExecutor`,
8. writes audit logs.

### Decision: no shell tools in Session 18

`run_command` steps are explicitly blocked.

Reason:
Shell execution belongs to a later controlled phase and must not be introduced accidentally.

### Decision: no automatic full-plan execution yet

Session 18 only supports executing one explicit step by id.

Reason:
Sequential execution, step state, retry, rollback, and history belong to Session 19.

### Decision: write tools remain self-protected

The runtime allows `read` and `write` permissions, but write tools still enforce their own contracts:

- `create_file` does not overwrite existing files.
- `edit_file` requires `diffConfirmed: true`.
- `edit_file` creates automatic backups.
- protected files remain blocked by guardrails.

## Session 19 — Execution Engine

### Decision: execution engine does not bypass runtime tool gate

`ExecutionEngine` executes through `RuntimeToolController`.

Reason:
Session 18 established the execution gate. Session 19 must orchestrate execution, not replace validation or permissions.

### Decision: step execution state is tracked separately

Step state is tracked with:

- pending
- running
- executed
- blocked
- failed
- skipped
- rolled_back

Reason:
Session 20+ needs runtime loop state and failure recovery.

### Decision: repeated executed steps are blocked

Already executed steps cannot be executed again by default.

Reason:
Execution must be deterministic and avoid duplicate writes.

### Decision: execution history is append-only

Execution events are written to `.runtime/execution-history.md`.

Reason:
Runtime decisions and tool executions must be auditable.

### Decision: rollback is only foundational for now

Session 19 detects rollback availability but does not orchestrate rollback yet.

Reason:
Failure recovery and rollback policies belong to later sessions.

## Session 20 — Runtime Loop v1

### Decision: runtime loop is single-run controlled

`RuntimeLoop.runOnce()` performs one controlled loop run.

Reason:
The first loop must be auditable and bounded. Infinite/autonomous loops are deferred.

### Decision: model may propose toolIntent

Plan steps may now include `toolIntent`.

Reason:
The runtime needs executable intent to map plan steps into `ToolExecutionRequest`, but the model still does not execute anything.

### Decision: runtime still owns execution

The runtime loop executes through:

- `ExecutionEngine`
- `RuntimeToolController`
- `RuntimeToolExecutionGate`
- `ToolExecutionValidator`
- `ToolPermissionManager`

Reason:
Session 20 must not bypass Sessions 18 and 19.

### Decision: runtime test artifacts are allowed in controlled roots

`ArchitecturePathGuard` allows controlled runtime test roots such as `.runtime/loop-tests/`.

Reason:
End-to-end loop tests need safe writable locations without opening all of `.runtime/`.

### Decision: no uncontrolled auto-execution

The loop can auto-approve only inside the explicit loop input.

Reason:
Approval and execution must remain explicit runtime choices.

## Session 21 — Failure Recovery + Replanner

### Decision: failure recovery is runtime-owned

Failures are classified by runtime code, not by model improvisation.

### Decision: no automatic retry yet

Retryable failures are identified, but automatic retry is deferred.

Reason:
Retries must be bounded, auditable, and policy-driven.

### Decision: no automatic replan execution

The replanner can prepare a suggested fallback objective, but it does not execute the replan automatically.

Reason:
A replan must go through normal runtime lifecycle:
objective -> plan -> validate -> approve -> ready -> execute.

### Decision: recursive recovery is blocked

`RecursiveFailureGuard` blocks excessive recovery depth.

Reason:
The runtime must not enter uncontrolled recovery recursion.

### Decision: repeated failure loops are detected

`LoopDetector` tracks failure signatures and blocks repeated occurrences.

Reason:
The runtime must not repeat the same failed action indefinitely.

### Decision: failure history is append-only

Failures are written to `.runtime/failure-history.md`.

Reason:
Runtime failures must be auditable.

## Session 22 — Context Compressor + Memory Compactor

### Decision: compressed context is preferred

RuntimeInitializer now prefers `.runtime/runtime-summary.md` and `.runtime/compressed-context.md` when available.

Reason:
Future runtime loops should avoid loading large raw memory files by default.

### Decision: compression is deterministic

Context compression uses local deterministic rules instead of model-generated summaries.

Reason:
Runtime memory compaction must be predictable, cheap, and safe.

### Decision: runtime-summary is critical context

`.runtime/runtime-summary.md` is loaded with critical priority.

Reason:
It provides a compact representation of current project state.

### Decision: compressed-context is secondary compact context

`.runtime/compressed-context.md` is loaded after runtime summary.

Reason:
It gives broader history only when token budget allows.

### Decision: retrieval comes after compression

Session 23 will add project-context retrieval.

Reason:
Compression reduces runtime memory; retrieval reduces project source context.
