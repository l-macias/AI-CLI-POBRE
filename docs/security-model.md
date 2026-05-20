# Zero Runtime Security Model

Zero Runtime is designed around runtime authority.

````txt
LLMs propose.
The runtime validates, controls, limits, audits, and decides.
Core rules
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
Provider boundary

Providers may return text.

Providers must not:

apply patches;
execute commands;
bypass parser/schema validation;
bypass patch safety validation;
bypass approval gates;
bypass model/provider policy;
write files directly;
leak secrets in logs or reports.
Patch boundary

Patch application must go through runtime-controlled patch apply.

Required controls:

parse patch proposal;
validate patch proposal schema;
validate operation safety;
check git boundary;
support dry-run;
require explicit confirmation;
create backups unless explicitly disabled;
revalidate after agent apply.
Agent boundary

Agent patch apply requires:

persisted patch proposal;
diff preview;
persisted approval request;
approved approval;
runtime patch apply execution;
revalidation;
report.
Git boundary

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
Real provider boundary

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

---

## `docs/release-checklist.md`

```md
# Zero Runtime Release Checklist

Target version:

```txt
v0.1.0
Deterministic gates

Run:

npm run check
npm run mvp:test
npm run release:readiness:test
npm run rc:test

Expected:

0 failed checks
Optional real provider gate

Only run intentionally:

npm run real-provider:test

Required environment:

ZERO_RUN_REAL_PROVIDER_TEST=1
ZERO_OPENROUTER_ENABLED=1
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=provider/model
CLI readiness

Verify:

npm run cli -- help
npm run cli -- quickstart
npm run cli -- doctor

Expected:

help shows recommended commands;
quickstart completes;
quickstart writes .runtime/quickstart-report.md;
doctor returns actionable checks.
Required docs
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

Do not release if:

mvp:test requires real provider credentials;
rc:test requires real provider credentials;
.env is committed;
API keys appear in logs, docs, examples, reports, or fixtures;
agent patch apply can bypass persisted approval;
patch apply can write without confirmation;
provider output can bypass schema validation;
git CLI can run destructive commands;
quickstart fails;
release readiness check fails.
Final command
npm run rc:test
````
