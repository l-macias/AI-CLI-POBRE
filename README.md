# Zero Runtime

Zero Runtime is a runtime-centered coding agent architecture for controlled, auditable, and deterministic AI-assisted software work.

The core idea is simple:

```txt
LLMs propose.
The runtime validates, controls, limits, audits, and decides.

Zero Runtime is not designed around trusting provider output. It is designed around runtime authority.

What makes Zero Runtime different

Most coding-agent systems give too much implicit authority to the model. Zero Runtime separates proposal from execution.

Providers can suggest structured output.
The runtime parses and validates every proposal.
Patch proposals must pass schema validation.
Patch application is controlled by the runtime.
Agent flows are approval-gated.
Git state is inspected before write operations.
Real providers require explicit opt-in.
Real-provider smoke tests are separated from deterministic MVP gates.
Quickstart uses a deterministic fake provider.
Reports and artifacts are written under .runtime.
Current MVP capabilities

Zero Runtime currently supports:

CLI project inspection.
CLI validation.
CLI repair proposal generation.
Fake/static repair providers.
Optional OpenRouter provider integration.
Provider policy checks.
Patch proposal parsing.
Controlled patch application.
Dry-run patch application.
Git status/diff/doctor commands.
Approval-gated agent loop.
Project memory reader/store.
Scaffold module proposal flow.
Quickstart product flow.
Release readiness checks.
Quickstart

Run the deterministic onboarding flow:

npm run cli -- quickstart

Or with an explicit project path:

npm run cli -- quickstart --project .runtime/quickstart/product-flow/project

The quickstart flow performs:

Scaffold module proposal with fake provider.
Save patch proposal.
Patch dry-run.
Controlled patch apply.
Project validation.
Git status audit.
Quickstart report generation.

The report is written to:

.runtime/quickstart-report.md

The quickstart does not call a real provider.

CLI

Main command:

npm run cli -- help

Recommended commands:

npm run cli -- quickstart
npm run cli -- doctor
npm run cli -- agent next --project ./target

Useful commands:

npm run cli -- inspect --project ./target --target src/index.ts
npm run cli -- validate --project ./target --target src/index.ts
npm run cli -- repair --project ./target --target src/index.ts --provider fake-llm
npm run cli -- git status --project ./target
npm run cli -- git diff --project ./target
npm run cli -- patch apply --project ./target --proposal .runtime/proposal.json --dry-run
Agent flow

The CLI agent loop is approval-gated.

Typical flow:

npm run cli -- agent start --project ./target --target src/index.ts --objective "Fix the issue"
npm run cli -- agent next --project ./target
npm run cli -- agent step inspect_project --project ./target
npm run cli -- agent step validate_project --project ./target
npm run cli -- agent step check_git --project ./target
npm run cli -- agent step request_repair_proposal --project ./target
npm run cli -- agent step show_diff_preview --project ./target
npm run cli -- agent step request_approval --project ./target
npm run cli -- agent approvals --project ./target
npm run cli -- agent approve <approval-id> --project ./target --reason "Approved after reviewing diff"
npm run cli -- agent step apply_patch --project ./target
npm run cli -- agent step revalidate_project --project ./target
npm run cli -- agent step report_result --project ./target
npm run cli -- agent report --project ./target

Patch application through the agent requires a persisted approved approval request.

Runtime safety model

Zero Runtime follows these rules:

Runtime remains the authority.
Provider output is never trusted directly.
Provider output must be parsed and schema-validated.
Patch proposals are validated before use.
Patch application requires explicit approval.
Patch apply supports dry-run mode.
Patch apply uses git guardrails.
Git CLI commands are read-only.
No uncontrolled shell commands.
No real provider call without explicit opt-in.
No premium model without approval.
No .env leakage in reports.
No auto-apply without runtime control.
Providers

The deterministic MVP flow uses fake/static providers.

OpenRouter support exists, but real-provider smoke tests are intentionally separated:

npm run real-provider:test

The MVP and release candidate gates stay deterministic:

npm run mvp:test
npm run rc:test
Tests

Core checks:

npm run check

MVP deterministic gate:

npm run mvp:test

Release candidate gate:

npm run rc:test

Release readiness only:

npm run release:readiness:test

Real provider tests:

npm run real-provider:test
Project structure
src/
  agent/
  cli/
  demo/
  git/
  memory/
  patch-apply/
  providers/
  release/
  repair/
  scaffold/
  security/
  workspace/

docs/
  cli-agent.md
  index.md
  provider-openrouter.md
  quickstart.md
  release-checklist.md
  scaffold.md
  security-model.md
Documentation
docs/index.md
docs/quickstart.md
docs/cli-agent.md
docs/provider-openrouter.md
docs/scaffold.md
docs/security-model.md
docs/release-checklist.md
Environment

Copy .env.example to .env only when you need local provider configuration.

cp .env.example .env

Current variables:

NODE_ENV=development
ZERO_OPENROUTER_ENABLED=0
ZERO_RUN_REAL_PROVIDER_TEST=0
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=
OPENROUTER_HTTP_REFERER=
OPENROUTER_APP_TITLE=Zero Runtime
ZERO_OPENROUTER_TIMEOUT_MS=30000
ZERO_OPENROUTER_MAX_TOKENS=1200

Do not commit .env.

Release readiness

Zero Runtime includes a deterministic release readiness check:

npm run release:readiness:test

It verifies:

Required scripts exist.
Package metadata is release-ready.
rc:test includes mvp:test.
real-provider:test stays separated.
Quickstart/product-flow tests exist.
docs/ exists.
.env.example exists.
Release-critical demo runner/reporter files exist.
Status

Current target version: v0.1.0.

Release goal: MVP candidate with deterministic quickstart, controlled patch apply, approval-gated agent loop, provider separation, and release readiness gate.
```
