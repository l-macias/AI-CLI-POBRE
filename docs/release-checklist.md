# Zero Runtime Release Checklist

Target version:

```txt
v0.1.0
Deterministic gates
npm run check
npm run mvp:test
npm run release:readiness:test
npm run rc:test
Optional real provider gate
npm run real-provider:test
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

mvp:test requires real provider credentials.
rc:test requires real provider credentials.
.env is committed.
API keys appear in logs, docs, examples, reports, or fixtures.
quickstart fails.
release readiness check fails.
```
