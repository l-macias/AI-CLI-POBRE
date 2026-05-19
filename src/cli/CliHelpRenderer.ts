export class CliHelpRenderer {
  public render(): string {
    return `Zero Runtime CLI

Usage:
  zero help
  zero init [--project ./path] [--overwrite]

  zero project add --path ./target --name "Target Project" [--no-current]
  zero project list
  zero project use "Target Project"
  zero project current
  zero project remove "Target Project"

  zero inspect --project ./path [--target src/file.ts] [--name "Project"] [--objective "..."]
  zero validate --project ./path [--target src/file.ts] [--name "Project"] [--objective "..."]
  zero repair --project ./path [--target src/file.ts] [--name "Project"] [--objective "..."] [--provider fake-llm|static] [--fake-provider-mode json_only|markdown_json|text_around_json|invalid_json|invalid_schema]

  zero agent start --project ./target --target src/file.ts --objective "Fix the issue" [--name "Project"]
  zero agent status --project ./target
  zero agent actions --project ./target
  zero agent approvals --project ./target
  zero agent next --project ./target
  zero agent step inspect_project --project ./target
  zero agent step validate_project --project ./target
  zero agent step check_git --project ./target
  zero agent step request_repair_proposal --project ./target
  zero agent step show_diff_preview --project ./target
  zero agent step request_approval --project ./target
  zero agent approve <approval-id> --project ./target [--reason "..."]
  zero agent reject <approval-id> --project ./target [--reason "..."]
  zero agent step apply_patch --project ./target
  zero agent step revalidate_project --project ./target
  zero agent step report_result --project ./target
  zero agent report --project ./target
  zero agent reset --project ./target --confirm-reset

  zero status [--project ./path]
  zero doctor [--project ./path]

  zero git status [--project ./target]
  zero git diff [--project ./target] [--target src/file.ts] [--staged] [--max-bytes 200000]
  zero git doctor [--project ./target] [--allow-dirty] [--allow-missing-repo]

  zero patch apply --project ./target --proposal .runtime/proposal.json --confirm-apply [--allow-dirty] [--allow-missing-repo] [--confirm-delete] [--no-backup]

Global:
  --format text|json

Commands:
  init
    Initialize .runtime structure for a target project.

  inspect
    Inspect a target project in read-only mode.

  validate
    Run controlled validation using allowed project scripts.

  repair
    Build repair context and produce a patch proposal preview.
    Provider output is parsed, schema-validated, policy-checked, and safety-validated.
    Does not apply patches automatically.

  agent
    Run an approval-gated interactive agent loop from the CLI.
    The loop can inspect, validate, check git state, request a repair proposal,
    show a diff preview, request approval, apply an approved patch, revalidate,
    and write a final report.

    Important:
      - agent start creates .runtime/agent-loop-state.json and .runtime/agent-loop-report.md.
      - agent step apply_patch requires a persisted approved patch_apply approval.
      - agent reset removes the current agent loop state/report and requires --confirm-reset.

  status
    Show basic runtime status.

  doctor
    Check runtime/project readiness.

  project
    Manage persistent target projects in .runtime/workspace-config.json.

  git
    Read git status, diff, and safe change boundary information.

  patch
    Apply a validated patch proposal with explicit approval and safety checks.

Agent lifecycle:
  1. zero agent start --project ./target --target src/file.ts --objective "Fix the issue"
  2. zero agent next --project ./target
  3. zero agent step inspect_project --project ./target
  4. zero agent step validate_project --project ./target
  5. zero agent step check_git --project ./target
  6. zero agent step request_repair_proposal --project ./target
  7. zero agent step show_diff_preview --project ./target
  8. zero agent step request_approval --project ./target
  9. zero agent approvals --project ./target
  10. zero agent approve <approval-id> --project ./target --reason "Approved after reviewing diff"
  11. zero agent step apply_patch --project ./target
  12. zero agent step revalidate_project --project ./target
  13. zero agent step report_result --project ./target
  14. zero agent report --project ./target

Safety:
  - Runtime remains the authority.
  - Provider output is never trusted directly.
  - Repair proposals must pass parser/schema validation.
  - Model/provider usage must pass runtime policy/budget checks.
  - Patch application requires explicit approval.
  - Agent patch application requires a persisted approved approval request.
  - Patch application uses backup, git guard, and current-content checks.
  - No uncontrolled shell commands.
  - Git CLI commands are read-only.
  - No git commit, push, reset, checkout, stash, add, or restore from CLI git commands.
  - No network calls in the current fake/static provider flow.
  - No .env reading.`;
  }
}
