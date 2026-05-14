## 2026-05-14T15:43:39.926Z — failure-2026-05-14T154339926Z

- Kind: protected_path
- Action: block
- Recovered: false
- Plan: failure-test-plan
- Step: step-protected
- Retryable: false
- Replan allowed: false
- Reason: Failure kind "protected_path" is blocked.
- Issues: PROTECTED_FILE_BLOCKED: Protected path blocked: .env
## 2026-05-14T15:43:39.929Z — failure-2026-05-14T154339929Z

- Kind: loop_detected
- Action: block
- Recovered: false
- Plan: failure-test-plan
- Step: step-protected
- Retryable: false
- Replan allowed: false
- Reason: Loop detected for signature "protected_path:failure-test-plan:step-protected".
- Issues: PROTECTED_FILE_BLOCKED: Protected path blocked: .env
## 2026-05-14T15:43:39.932Z — failure-2026-05-14T154339931Z

- Kind: recursive_failure
- Action: block
- Recovered: false
- Plan: failure-test-plan-2
- Step: step-generic
- Retryable: false
- Replan allowed: false
- Reason: Recursive failure depth 2 exceeded maxDepth 1.
- Issues: PLAN_STEP_NOT_FOUND: Step was not found.
