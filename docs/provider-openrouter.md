# OpenRouter Provider

Zero Runtime can use OpenRouter as a real repair proposal provider, but the provider is never the authority.

The runtime remains responsible for:

- loading config safely;
- enforcing explicit opt-in;
- checking provider/model policy;
- estimating cost;
- normalizing provider responses;
- parsing provider text;
- validating `PatchProposal` schema;
- validating patch safety;
- generating diff previews;
- requiring approval before any write.

## Security model

Provider output is untrusted.

OpenRouter can propose text, but Zero Runtime controls the execution path:

```txt
OpenRouter proposes text
Runtime normalizes response
Runtime parses PatchProposal JSON
Runtime validates PatchProposal schema
Runtime validates patch safety
Runtime generates diff preview
User approves explicitly
Runtime applies only if approval exists
Runtime revalidates
Runtime reports
```

The OpenRouter integration must not:

- apply patches directly;
- bypass parser/schema validation;
- bypass patch safety validation;
- bypass model policy;
- bypass approval gates;
- log API keys;
- include API keys in errors;
- require network in normal deterministic tests;
- run paid or real provider calls without explicit opt-in.

## Environment variables

Required for real provider usage:

```env
ZERO_OPENROUTER_ENABLED=1
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=provider/model
```

Optional:

```env
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
ZERO_OPENROUTER_TIMEOUT_MS=30000
ZERO_OPENROUTER_MAX_TOKENS=1200
OPENROUTER_HTTP_REFERER=https://your-app.example
OPENROUTER_APP_TITLE=Zero Runtime
```

Real smoke tests also require:

```env
ZERO_RUN_REAL_PROVIDER_TEST=1
```

## Model selection

The OpenRouter adapter should not own long-term model strategy.

Model selection should come from:

- CLI flags;
- workspace config;
- provider strategy;
- repair/model policy;
- explicit environment config.

For CLI repair, provide a model explicitly:

```bash
zero repair \
  --project ./target \
  --target src/example.ts \
  --objective "Fix the issue safely" \
  --provider openrouter \
  --allow-real-provider \
  --model provider/model
```

If `--model` is omitted, `OPENROUTER_DEFAULT_MODEL` must be configured.

## Real provider opt-in

Real provider usage requires explicit CLI opt-in:

```bash
--allow-real-provider
```

This prevents accidental network/API calls.

Without this flag, this command must fail before constructing a real provider call:

```bash
zero repair --provider openrouter
```

## Deterministic test gates

Normal MVP and RC gates must not call OpenRouter:

```bash
npm run mvp:test
npm run rc:test
```

OpenRouter real smoke tests are intentionally separate:

```bash
npm run real-provider:test
```

## Local non-network tests

These tests should not require a real OpenRouter request:

```bash
npm run provider:openrouter-config:test
npm run provider:openrouter-client:test
npm run provider:response-normalizer:test
npm run repair:openrouter-provider:test
npm run cli:repair-openrouter-provider:test
npm run typecheck
npm run lint
```

## Optional real smoke tests

The smoke tests are skipped unless explicitly enabled.

Run all real provider smoke tests:

```bash
ZERO_RUN_REAL_PROVIDER_TEST=1 \
ZERO_OPENROUTER_ENABLED=1 \
OPENROUTER_API_KEY=your_openrouter_api_key \
OPENROUTER_DEFAULT_MODEL=provider/model \
npm run real-provider:test
```

Run only repair smoke test:

```bash
ZERO_RUN_REAL_PROVIDER_TEST=1 \
ZERO_OPENROUTER_ENABLED=1 \
OPENROUTER_API_KEY=your_openrouter_api_key \
OPENROUTER_DEFAULT_MODEL=provider/model \
npm run repair:openrouter-smoke:test
```

PowerShell:

```powershell
$env:ZERO_RUN_REAL_PROVIDER_TEST="1"
$env:ZERO_OPENROUTER_ENABLED="1"
$env:OPENROUTER_API_KEY="your_openrouter_api_key"
$env:OPENROUTER_DEFAULT_MODEL="provider/model"
npm run real-provider:test
```

## Expected smoke-test behavior

The smoke tests may contact OpenRouter only when explicitly enabled.

They should:

- build a small controlled request;
- request a low-risk proposal;
- normalize the provider response;
- parse returned text;
- validate `PatchProposal` schema;
- validate patch safety;
- print only safe metadata.

They must not:

- apply patches;
- write to the target project without runtime approval;
- print API keys;
- print raw secret-bearing provider payloads;
- run inside `mvp:test`;
- run inside deterministic `provider:all:test`.

## Current integration scope

Current status:

```txt
zero repair --provider openrouter                 ✅ supported with explicit opt-in
zero agent start --provider openrouter            ✅ supported with explicit opt-in/config persistence
zero agent step request_repair_proposal            ✅ supported through runtime bridge/provider policy
zero agent step apply_patch                        ✅ still approval-gated
npm run mvp:test                                   ✅ deterministic
npm run rc:test                                    ✅ deterministic + readiness
npm run real-provider:test                         ⚠️ optional real smoke tests
```

Agent integration must remain explicit and auditable because the agent loop persists state and uses approval-gated actions.

## Release rule

Do not add real provider smoke tests to:

```txt
mvp:test
provider:all:test
cli:all:test
agent:all:test
```

Use:

```txt
real-provider:test
```

for real network/API validation.
