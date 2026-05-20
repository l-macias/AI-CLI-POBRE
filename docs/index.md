Zero Runtime Documentation

Zero Runtime is a runtime-centered coding agent architecture.

The central rule:

LLMs propose.
The runtime validates, controls, limits, audits, and decides.

Start here

Quickstart

CLI Agent

Scaffold

OpenRouter Provider

Security Model

Release Checklist

Product flow

Use quickstart to validate the deterministic MVP flow:

npm run cli -- quickstart

The quickstart runs:

Scaffold proposal.

Patch dry-run.

Controlled patch apply.

Validation.

Git audit.

Quickstart report.

Report artifact: .runtime/quickstart-report.md

Agent flow

The agent loop is approval-gated.

Start:

npm run cli -- agent start --project ./target --target src/index.ts --objective "Fix the issue"

Continue:

npm run cli -- agent next --project ./target

Provider strategy

Deterministic MVP gates use fake/static providers. Real OpenRouter tests are separated:

npm run real-provider:test

Do not add real provider smoke tests to:

mvp:test

provider:all:test

cli:all:test

agent:all:test

Release gates

Deterministic MVP gate:

npm run mvp:test

Release candidate gate:

npm run rc:test

Release readiness only:

npm run release:readiness:test

2. Security Model (docs/security-model.md)

Zero Runtime Security Model

Zero Runtime is designed around runtime authority. The model is never trusted as an executor.

Provider proposes.
Runtime validates.
Runtime controls.
Runtime applies only after policy and approval gates.

Core principles

Runtime remains the authority.

Provider output is untrusted.

Provider output must be parsed.

Provider output must be schema-validated.

Patch proposals must be safety-validated.

Patch application requires explicit approval.

Agent patch application requires persisted approval.

Real provider usage requires explicit opt-in.

Real provider smoke tests are separated from deterministic gates.

Git commands exposed through the CLI are read-only.

.env values must not be logged, printed, stored in reports, or committed.

Provider boundary

Providers may return text. Providers must not:

Apply patches.

Execute commands.

Bypass parser/schema validation.

Bypass patch safety validation.

Bypass approval gates.

Bypass model/provider policy.

Write files directly.

Leak secrets in logs or reports.

Patch boundary

Patch application must go through runtime-controlled patch apply.

Required controls:

Parse patch proposal.

Validate patch proposal schema.

Validate operation safety.

Check git boundary.

Support dry-run.

Require explicit confirmation.

Create backups unless disabled explicitly.

Revalidate after agent apply.

Agent boundary

The agent loop can plan and progress through actions, but sensitive operations remain gated.

Agent patch apply requires:

Persisted patch proposal.

Diff preview.

Persisted approval request.

Approved approval.

Runtime patch apply execution.

Revalidation.

Report.

Git boundary

CLI git commands are read-only.

Allowed:

git status

git diff

git doctor

Forbidden through CLI git commands:

git commit

git push

git reset

git checkout

git stash

git add

git restore

Real provider boundary

Real provider usage must be explicit.

Required flag:

--allow-real-provider

For smoke tests:

ZERO_RUN_REAL_PROVIDER_TEST=1
ZERO_OPENROUTER_ENABLED=1
OPENROUTER_API_KEY=...
OPENROUTER_DEFAULT_MODEL=...

Real provider tests must stay outside deterministic MVP/RC sub-gates except through explicit real-provider:test.

Deterministic gates

These must not require network or secrets:

npm run mvp:test

npm run rc:test

npm run release:readiness:test

Secret handling

Do not log:

API keys.

.env contents.

Provider auth headers.

Raw provider payloads that may contain secrets.

Sensitive user/project data unless explicitly safe.

.env.example is allowed. .env is not a source of documentation and must not be committed.

3. Release Checklist (docs/release-checklist.md)

Zero Runtime Release Checklist

Target version: v0.1.0

Required deterministic gates

Run:

npm run check
npm run mvp:test
npm run release:readiness:test
npm run rc:test

Expected: 0 failed checks

Optional real provider gate

Run only when intentionally testing OpenRouter:

npm run real-provider:test

Required environment:

ZERO_RUN_REAL_PROVIDER_TEST=1
ZERO_OPENROUTER_ENABLED=1
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=provider/model

This gate is optional and must stay separate from deterministic release gates.

CLI readiness

Verify:

npm run cli -- help
npm run cli -- quickstart
npm run cli -- doctor

Expected:

help shows recommended commands.

quickstart completes.

quickstart writes .runtime/quickstart-report.md.

doctor returns actionable checks.

Product flow readiness

Verify quickstart flow:

npm run product-flow:test
npm run cli:quickstart:test

Expected statuses:

Scaffold: patch_ready

Dry-run: dry_run

Apply: applied

Validation: passed

Git working tree: dirty

Agent readiness

Verify:

npm run agent:all:test
npm run cli:agent-flow:test
npm run cli:agent-ux:test

Required properties:

Agent state persists.

agent next is actionable.

Patch apply is approval-gated.

Reports are written.

Real provider config remains explicit.

Patch readiness

Verify:

npm run patch:all:test

Required properties:

Invalid proposals fail.

Invalid operation shape fails.

Apply without confirmation is blocked.

Dry-run does not write files.

Confirmed apply writes through runtime-controlled path.

Security readiness

Verify:

npm run security:all:test

Required properties:

Protected paths are enforced.

Secret leakage is checked.

Provider output threats are checked.

Patch threats are checked.

Approval bypass regressions are checked.

Runtime report leak checks pass.

Memory poisoning tests pass.

Provider readiness

Verify deterministic provider tests:

npm run provider:all:test
npm run repair:all:test

Required properties:

Fake/static providers are deterministic.

OpenRouter config tests do not require real network.

OpenRouter provider tests do not leak secrets.

Real smoke tests are separated.

Documentation readiness

Required docs:

README.md

docs/index.md

docs/quickstart.md

docs/cli-agent.md

docs/scaffold.md

docs/provider-openrouter.md

docs/security-model.md

docs/release-checklist.md

.env.example

Release blockers

Do not release if any of these are true:

mvp:test requires real provider credentials.

rc:test requires real provider credentials.

.env is committed.

API keys appear in logs, docs, examples, reports, or fixtures.

Agent patch apply can bypass persisted approval.

Patch apply can write without confirmation.

Provider output can bypass schema validation.

Git CLI can run destructive commands.

Quickstart fails.

Release readiness check fails.

Final command

Before tagging:

npm run rc:test
