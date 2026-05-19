# Real Project Trial

## Objective tested

Fix the broken component.

## Status

- Attempt ID: repair-attempt-2026-05-18T194703462Z
- Status: diff_ready
- Project root: C:\Users\LUCAS\Desktop\zero\.runtime\repair-attempt-test-project
- Created: 2026-05-18T19:47:03.462Z
- Completed: 2026-05-18T19:47:03.465Z

## Plan generated

The runtime generated a repair request and prompt. The repair proposal was provided by a repair proposal provider.

## Steps executed

- [executed] context_built: Repair context built from target files.
- [executed] request_built: Repair request built.
- [executed] prompt_built: Repair prompt built.
- [executed] proposal_received: Patch proposal received.
- [executed] patch_validation: Patch proposal passed safety validation.
- [executed] diff_preview: Diff preview generated.

## Findings

- typescript-direct: src/components/Broken.tsx:2:10 — src/components/Broken.tsx(2,10): error TS1382: Unexpected token.

## Target files

- src/components/Broken.tsx (65 bytes)

## Patch proposal

- Summary: Fix broken component text.
- Risk level: low

### Operations

- replace_file: src/components/Broken.tsx — Replace invalid/broken output with corrected JSX.

## Patch validation

- Valid: true

- none

## Diff Preview — src/components/Broken.tsx

- Changed: true
- Changed lines: 1

# Real Project Trial Diff Preview

## Target

src/components/Broken.tsx

## Issues

- none

## Diff Preview

### Line 2 — changed
```diff
-   return <section>Broken</section>;
+   return <section>Fixed</section>;
```

## Notes

No files were edited. This preview was generated from an external patch proposal.


## Blockers

- none

## Failures

- none

## Cost estimate

- Provider: static
- Model: static-repair-proposal
- Prompt tokens: 0
- Completion tokens: 0
- Total tokens: 0
- Estimated USD: 0
## Model policy

- Allowed: false
- Status: none
- Provider requested: none
- Selected provider: none
- Selected model: none
- Requires premium approval: false
- Fallback used: false
- Fallback reason: none

### Model policy issues

- none
## Improvements needed

- Connect repair proposal provider to the real LLM provider policy.
- Add patch proposal parser for model JSON output.
- Add approval gate before controlled write.
- Add post-write revalidation.
- Add multi-file related context expansion.

## Notes

No files were written in this phase. The runtime only prepared and validated a repair proposal.
