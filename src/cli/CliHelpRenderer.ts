export class CliHelpRenderer {
  public render(): string {
    return `Zero Runtime CLI

Usage:
  zero help
  zero context [--max-tokens 1500] [--format text|json]
  zero validate [--format text|json]
  zero validation-feedback [--format text|json]
  zero code-intel [--file src/path/File.ts] [--query "text"] [--max-chunks 8] [--format text|json]

Commands:
  help
    Show this help message.

  context
    Load runtime context from .runtime files using RuntimeInitializer.

  validate
    Run the current validation pipeline.
    Current validators may return skipped while command execution is deferred.

  validation-feedback
    Run validation pipeline and convert results into structured feedback.

  code-intel
    Generate a code intelligence report for a target file or query.

Safety:
  - No shell commands.
  - No git commands.
  - No network tools.
  - No child_process.
  - CLI only calls internal runtime-controlled APIs.`;
  }
}
