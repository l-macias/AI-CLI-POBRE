Zero Runtime Quickstart

The quickstart command runs a deterministic end-to-end product flow.

npm run cli -- quickstart

With explicit project path:

npm run cli -- quickstart --project .runtime/quickstart/product-flow/project

Flow

Quickstart runs:

Scaffold proposal;

Save patch proposal;

Patch dry-run;

Controlled patch apply;

Validation;

Git audit;

Report generation.

Report

The report is written to:

.runtime/quickstart-report.md

It includes:

Project root;

Proposal path;

Report path;

Scaffold status;

Dry-run status;

Apply status;

Validation status;

Git working tree status;

Generated files;

Changed files;

Equivalent commands;

Safety notes;

Recommended next steps.

Safety

Quickstart uses the deterministic fake provider.

It does not call a real provider.

The provider does not directly write files.

The runtime controls the path:
proposal -> dry-run -> apply -> validate -> git audit -> report

Expected Output

Zero Runtime quickstart

Status: ok

Flow:

- Scaffold: patch_ready
- Dry run: dry_run
- Apply: applied
- Validation: passed

Git:

- Working tree: dirty

Next Steps

After quickstart:

git diff
npm run rc:test

For real project work, use the approval-gated agent flow:

npm run cli -- agent start --project ./target --target src/index.ts --objective "Fix the issue"
npm run cli -- agent next --project ./target

Zero Runtime Security Model

Zero Runtime is designed around runtime authority.

LLMs propose.
The runtime validates, controls, limits, audits, and decides.

Core Rules

Runtime remains the authority.

Provider output is untrusted.

Provider output must be parsed.

Provider output must be schema-validated.

Patch proposals must be safety-validated.

Patch application requires explicit approval.

Agent patch application requires persisted approval.

Real provider usage requires explicit opt-in.

Real provider smoke tests stay outside deterministic gates.

Git CLI commands are read-only.

.env values must not be logged, printed, stored in reports, or committed.

Provider Boundary

Providers may return text. Providers must not:

Apply patches;

Execute commands;

Bypass parser/schema validation;

Bypass patch safety validation;

Bypass approval gates;

Bypass model/provider policy;

Write files directly;

Leak secrets in logs or reports.

Patch Boundary

Patch application must go through runtime-controlled patch apply.

Required controls:

Parse patch proposal;

Validate patch proposal schema;

Validate operation safety;

Check git boundary;

Support dry-run;

Require explicit confirmation;

Create backups unless explicitly disabled;

Revalidate after agent apply.

Agent Boundary

Agent patch apply requires:

Persisted patch proposal;

Diff preview;

Persisted approval request;

Approved approval;

Runtime patch apply execution;

Revalidation;

Report.

Git Boundary

Allowed through CLI:

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

Real Provider Boundary

Real provider usage requires:

--allow-real-provider

Real smoke tests require explicit environment opt-in:

ZERO_RUN_REAL_PROVIDER_TEST=1
ZERO_OPENROUTER_ENABLED=1
OPENROUTER_API_KEY=...
OPENROUTER_DEFAULT_MODEL=...

These deterministic gates must not require network or secrets:

npm run mvp:test
npm run rc:test
npm run release:readiness:test

Deterministic Gates

Run:

npm run check
npm run mvp:test
npm run release:readiness:test
npm run rc:test

Expected: 0 failed checks

Optional Real Provider Gate

Only run intentionally:

npm run real-provider:test

Required environment:

ZERO_RUN_REAL_PROVIDER_TEST=1
ZERO_OPENROUTER_ENABLED=1
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=provider/model

CLI Readiness

Verify:

npm run cli -- help
npm run cli -- quickstart
npm run cli -- doctor

Expected:

help shows recommended commands;

quickstart completes;

quickstart writes .runtime/quickstart-report.md;

doctor returns actionable checks.

Required Docs

README.md

docs/index.md

docs/quickstart.md

docs/cli-agent.md

docs/scaffold.md

docs/provider-openrouter.md

docs/security-model.md

docs/release-checklist.md

.env.example

Release Blockers

Do not release if:

mvp:test requires real provider credentials;

rc:test requires real provider credentials;

.env is committed;

API keys appear in logs, docs, examples, reports, or fixtures;

Agent patch apply can bypass persisted approval;

Patch apply can write without confirmation;

Provider output can bypass schema validation;

Git CLI can run destructive commands;

Quickstart fails;

Release readiness check fails.

Final Command

npm run rc:test
