# Zero Runtime CLI Agent

Zero Runtime includes an approval-gated CLI agent loop.

The agent loop is not an autonomous writer. It is a controlled runtime workflow where the runtime remains the authority.

user objective  
 -> agent loop state  
 -> inspect  
 -> validate  
 -> git boundary  
 -> repair proposal  
 -> diff preview  
 -> approval request  
 -> explicit approval  
 -> patch apply  
 -> revalidate  
 -> final report

## Core principle

The provider proposes. The runtime controls.

Provider output  
 -> parser  
 -> schema validation  
 -> model policy / budget check  
 -> safety validation  
 -> diff preview  
 -> approval gate  
 -> patch apply  
 -> revalidation  
 -> report

## Generated files

When running the CLI agent, Zero Runtime writes loop state and reports inside the target project:

.runtime/agent-loop-state.json  
.runtime/agent-loop-report.md

These are generated runtime artifacts. They are useful for audit/debugging, but they should generally not be committed unless intentionally needed.

## Start a loop

zero agent start \\  
 --project ./target \\  
 --target src/index.ts \\  
 --name "Target Project" \\  
 --objective "Fix the TypeScript error in src/index.ts"

This creates a persisted agent loop state and report.

## Show status

```
zero agent status --project ./target
```

## Show available actions

```
zero agent actions --project ./target
```

## Show approvals

```
zero agent approvals --project ./target
```

## Show the next suggested action

```
zero agent next --project ./target
```

## Recommended full lifecycle

zero agent start \\  
 --project ./target \\  
 --target src/index.ts \\  
 --objective "Fix the TypeScript error in src/index.ts"

zero agent step inspect_project --project ./target  
zero agent step validate_project --project ./target  
zero agent step check_git --project ./target  
zero agent step request_repair_proposal --project ./target  
zero agent step show_diff_preview --project ./target  
zero agent step request_approval --project ./target

zero agent approvals --project ./target

After reviewing the diff/report, approve the pending approval:

zero agent approve <approval-id> \\  
 --project ./target \\  
 --reason "Approved after reviewing the diff preview"

Then continue:

zero agent step apply_patch --project ./target  
zero agent step revalidate_project --project ./target  
zero agent step report_result --project ./target  
zero agent report --project ./target

## Reject an approval

zero agent reject <approval-id> \\  
 --project ./target \\  
 --reason "Rejected because the proposed patch is not acceptable"

## Reset a loop

```
zero agent reset --project ./target --confirm-reset
```

This removes:

.runtime/agent-loop-state.json  
.runtime/agent-loop-report.md

Reset requires `--confirm-reset` intentionally.

## Actions

The current action kinds are:

inspect_project  
validate_project  
check_git  
build_repair_context  
request_repair_proposal  
show_diff_preview  
request_approval  
apply_patch  
revalidate_project  
report_result  
cancel

Most actions are executed with:

```
zero agent step <action-kind> --project ./target
```

Example:

```
zero agent step validate_project --project ./target
```

## Approval gate

Patch application is blocked unless a persisted approval exists with status `approved`.

This means the following is blocked:

```
zero agent step apply_patch --project ./target
```

until this sequence has happened:

zero agent step request_approval --project ./target  
zero agent approvals --project ./target  
zero agent approve <approval-id> --project ./target --reason "Approved"

## Safety model

Zero Runtime agent CLI follows these rules:

- The runtime is the authority.
- Provider output is never trusted directly.
- Repair proposals must pass parser/schema validation.
- Model/provider usage must pass model policy and budget checks.
- Patch proposals must pass safety validation.
- Patch application requires explicit approval.
- Agent patch application requires persisted approval state.
- Patch application uses backup, git guard, and current-content checks.
- Git commands exposed by the CLI are read-only.
- No uncontrolled shell commands are executed by the agent flow.
- No real paid model call is required by the current fake/static provider flow.

## Current provider behavior

The current default repair provider for the CLI agent is the fake model provider:

```
fake-llm
```

This simulates LLM-like output but still passes through the full runtime pipeline:

FakeLlmRepairProposalProvider  
 -> PatchProposalParser  
 -> PatchProposalSchema  
 -> PolicyAwareRepairProposalProvider  
 -> PatchSafetyValidator  
 -> diff preview

## Troubleshooting

### No agent loop state found

Run:

```
zero agent start --project ./target --target src/index.ts --objective "..."
```

### Reset requires confirmation

Run:

```
zero agent reset --project ./target --confirm-reset
```

### Approval not found

Check existing approvals:

```
zero agent approvals --project ./target
```

### Cannot report before apply/revalidate

The final report step requires:

zero agent step apply_patch --project ./target  
zero agent step revalidate_project --project ./target

before:

```
zero agent step report_result --project ./target
```
