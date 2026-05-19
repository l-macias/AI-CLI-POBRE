# OpenRouter Provider

Zero Runtime can use OpenRouter as a real repair proposal provider, but the provider is never the authority.

The runtime remains responsible for:

- loading config safely;
- enforcing explicit opt-in;
- checking provider/model policy;
- estimating cost;
- normalizing provider response;
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

The OpenRouter integration must not:

apply patches directly;
bypass parser/schema validation;
bypass patch safety validation;
bypass model policy;
bypass approval gates;
log API keys;
include API keys in errors;
require network in normal tests;
run paid or real provider calls without explicit opt-in.
Environment variables

Required for real provider usage:

ZERO_OPENROUTER_ENABLED=1
OPENROUTER_API_KEY=your_openrouter_api_key
ZERO_OPENROUTER_MODEL=provider/model

Optional:

OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
ZERO_OPENROUTER_TIMEOUT_MS=30000
ZERO_OPENROUTER_MAX_TOKENS=1200
OPENROUTER_HTTP_REFERER=https://your-app.example
OPENROUTER_APP_TITLE="Zero Runtime"
Model selection

The OpenRouter adapter should not decide long-term model strategy.

Model selection should come from:

CLI flags;
workspace config;
provider strategy;
repair/model policy;
explicit environment config.

For CLI repair, you can provide a model explicitly:

zero repair \
  --project ./target \
  --target src/example.ts \
  --objective "Fix the issue safely" \
  --provider openrouter \
  --allow-real-provider \
  --model provider/model

If --model is omitted, ZERO_OPENROUTER_MODEL must be set.

Real provider opt-in

Real provider usage requires explicit CLI opt-in:

--allow-real-provider

This prevents accidental network/API calls.

Without this flag, zero repair --provider openrouter must fail before constructing a real provider call.

Running local tests

Normal tests do not call OpenRouter:

npm run provider:openrouter-config:test
npm run provider:openrouter-client:test
npm run provider:response-normalizer:test
npm run repair:openrouter-provider:test
npm run cli:repair-openrouter-provider:test
npm run typecheck
npm run lint
Running the optional real smoke test

The smoke test is skipped unless explicitly enabled:

npm run repair:openrouter-smoke:test

To run it for real:

ZERO_RUN_REAL_PROVIDER_TEST=1 \
ZERO_OPENROUTER_ENABLED=1 \
OPENROUTER_API_KEY=your_openrouter_api_key \
ZERO_OPENROUTER_MODEL=provider/model \
npm run repair:openrouter-smoke:test

On Windows PowerShell:

$env:ZERO_RUN_REAL_PROVIDER_TEST="1"
$env:ZERO_OPENROUTER_ENABLED="1"
$env:OPENROUTER_API_KEY="your_openrouter_api_key"
$env:ZERO_OPENROUTER_MODEL="provider/model"
npm run repair:openrouter-smoke:test
Expected smoke-test behavior

The smoke test:

builds a small in-memory RepairRequest;
asks the provider for a low-risk patch proposal;
normalizes the provider response;
parses the returned text;
validates the PatchProposal schema;
validates patch safety;
prints only safe metadata.

It does not apply patches.

It does not write to the target project.

It does not print the API key.

It does not print raw provider response bodies.

Current integration scope

Current status:

zero repair --provider openrouter ✅
zero agent start --provider openrouter ❌ not integrated yet

Agent integration should be done separately because the agent loop persists state and uses approval-gated actions. Real provider usage inside the agent should remain explicit and auditable.
```

---
