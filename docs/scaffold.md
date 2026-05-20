# Zero Runtime Scaffold

Zero Runtime scaffold generates module proposals through the runtime pipeline. It does not write project files directly.

## Core rule

```txt
scaffold proposes
patch apply writes

The scaffold pipeline is intentionally split from patch application:

CLI / Agent
→ ScaffoldIntentParser
→ ScaffoldProjectConventionReader
→ ScaffoldRequestBuilder
→ ModuleGeneratorProvider
→ ScaffoldProposalParser / Schema
→ ScaffoldSafetyValidator
→ ScaffoldPatchBridge
→ ScaffoldDiffBuilder
→ ScaffoldReporter
→ optional PatchProposal handoff
→ PatchApplyRunner only after explicit patch apply
Why this exists

Scaffolding is a high-leverage operation. A provider can generate many files quickly, but it must never become the authority.

In Zero Runtime:

LLM/provider proposes.
Runtime validates.
Runtime builds diff.
User reviews.
PatchApplyRunner writes.
Scaffold command
zero scaffold module \
  --project ./target-project \
  --name auth \
  --kind backend \
  --target src/modules/auth \
  --provider fake-llm

This generates:

.runtime/scaffold-report.json

The report includes:

- parsed intent
- detected project conventions
- scaffold request
- raw provider metadata
- scaffold proposal
- safety result
- PatchProposal
- diff previews
- failures, if any
Save a PatchProposal

To save the generated PatchProposal for later application:

zero scaffold module \
  --project ./target-project \
  --name auth \
  --kind backend \
  --target src/modules/auth \
  --provider fake-llm \
  --save-proposal .runtime/proposals/auth-module.patch-proposal.json

This still does not write scaffold files.

Apply the saved proposal

Patch application is separate and explicit:

zero patch apply \
  --project ./target-project \
  --proposal ./target-project/.runtime/proposals/auth-module.patch-proposal.json \
  --confirm-apply

If the working tree is dirty because runtime artifacts were generated, and the user accepts that condition:

zero patch apply \
  --project ./target-project \
  --proposal ./target-project/.runtime/proposals/auth-module.patch-proposal.json \
  --confirm-apply \
  --allow-dirty
Safety guarantees

Scaffold validates:

- empty or dangerous names
- path traversal
- protected paths
- .env / secrets targets
- .git / node_modules / build output targets
- runtime state targets
- duplicate file targets
- replace_file without overwrite opt-in
- existing create_file targets without overwrite opt-in
- secret-looking content
- exfiltration patterns
- runtime/approval tampering patterns
Agent integration

The agent supports a scaffold action:

scaffold_module

This action generates:

- scaffold report
- PatchProposal
- diff previews

It does not:

- write scaffold files
- apply patches
- create approvals automatically
- bypass PatchApplyRunner

Agent scaffold metadata:

{
  "scaffoldModuleName": "auth",
  "scaffoldModuleKind": "backend",
  "scaffoldTargetPath": "src/modules/auth",
  "scaffoldProvider": "fake-llm",
  "scaffoldOverwriteExisting": false,
  "scaffoldDryRun": true,
  "includeProjectMemory": false
}
Real provider rule

Using OpenRouter requires explicit opt-in:

zero scaffold module \
  --project ./target-project \
  --name auth \
  --kind backend \
  --target src/modules/auth \
  --provider openrouter \
  --model poolside/laguna-xs.2:free \
  --allow-real-provider

Provider output still remains only a proposal. It never authorizes writes.

Regression tests

Run the scaffold suite:

npm run scaffold:all:test

Or run the main CLI scaffold tests:

npm run cli:scaffold-module:test
npm run cli:scaffold-handoff:test
npm run cli:scaffold-apply-handoff:test
npm run agent:scaffold-module:test
Architecture decision

Scaffold is intentionally not a direct file writer.

The only allowed write path for generated scaffold files is:

ScaffoldRunner
→ PatchProposal
→ zero patch apply
→ PatchApplyRunner

This preserves runtime authority, auditability, safety validation, diff review, and user-controlled application.
```
