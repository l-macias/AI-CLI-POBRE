import type { RuntimeBootstrapFile, StackDetectionResult } from './BootstrapTypes.js';

export class RuntimeBootstrapTemplate {
  public buildFiles(stack: StackDetectionResult): RuntimeBootstrapFile[] {
    return [
      {
        relativePath: '.runtime/current-state.md',
        content: this.currentState(stack),
      },
      {
        relativePath: '.runtime/active-module.md',
        content: this.activeModule(),
      },
      {
        relativePath: '.runtime/decisions.md',
        content: this.decisions(),
      },
      {
        relativePath: '.runtime/next-steps.md',
        content: this.nextSteps(),
      },
      {
        relativePath: '.runtime/progress-log.md',
        content: this.progressLog(),
      },
      {
        relativePath: '.runtime/handoff.md',
        content: this.handoff(stack),
      },
      {
        relativePath: '.runtime/runtime-rules.md',
        content: this.runtimeRules(),
      },
      {
        relativePath: '.runtime/provider-rules.md',
        content: this.providerRules(),
      },
      {
        relativePath: '.runtime/coding-conventions.md',
        content: this.codingConventions(stack),
      },
      {
        relativePath: '.runtime/security-policy.md',
        content: this.securityPolicy(),
      },
      {
        relativePath: '.runtime/project-profile.md',
        content: this.projectProfile(stack),
      },
      {
        relativePath: '.runtime/runtime-config.json',
        content: this.runtimeConfig(stack),
      },
    ];
  }

  private currentState(stack: StackDetectionResult): string {
    return `# Current State

Project bootstrap completed.

## Detected stack

${this.renderList(stack.stacks)}

## Status

Ready for runtime initialization.
`;
  }

  private activeModule(): string {
    return `# Active Module

## Module

Project Bootstrap

## Status

Initialized.
`;
  }

  private decisions(): string {
    return `# Decisions

## Bootstrap

The runtime directory was initialized deterministically.

Rules:
- Runtime owns validation.
- Model proposes.
- Runtime decides.
- No command execution unless explicitly enabled by runtime policy.
`;
  }

  private nextSteps(): string {
    return `# Next Steps

- Review project profile.
- Review runtime rules.
- Configure provider policy.
- Run runtime context loading.
`;
  }

  private progressLog(): string {
    return `# Progress Log

## Bootstrap

Runtime memory structure initialized.
`;
  }

  private handoff(stack: StackDetectionResult): string {
    return `# Handoff

## Project initialized

Detected stack:
${this.renderList(stack.stacks)}

Next operator should review:
- runtime-rules.md
- provider-rules.md
- coding-conventions.md
- security-policy.md
- project-profile.md
`;
  }

  private runtimeRules(): string {
    return `# Runtime Rules

- The runtime is the authority.
- The model only proposes.
- Validate before executing.
- Do not bypass guardrails.
- Prefer deterministic operations.
- Keep edits minimal and auditable.
`;
  }

  private providerRules(): string {
    return `# Provider Rules

- Use cheap/free models for simple tasks when possible.
- Escalate to premium only when policy allows it.
- Every model choice must be auditable.
- Never hardcode a single provider as the only path.
`;
  }

  private codingConventions(stack: StackDetectionResult): string {
    return `# Coding Conventions

Detected stack:
${this.renderList(stack.stacks)}

Default conventions:
- Prefer small modules.
- Prefer explicit types.
- Avoid unsafe casts.
- Keep imports consistent with project module system.
- Do not introduce broad rewrites without plan approval.
`;
  }

  private securityPolicy(): string {
    return `# Security Policy

- Do not read .env files.
- Do not expose secrets.
- Do not execute shell commands unless runtime policy enables controlled execution.
- Do not access network unless explicitly allowed.
- Do not modify protected files without confirmation.
`;
  }

  private projectProfile(stack: StackDetectionResult): string {
    return `# Project Profile

## Stack

${this.renderList(stack.stacks)}

## Package manager

${stack.packageManager ?? 'unknown'}

## Project signals

- package.json: ${stack.hasPackageJson ? 'yes' : 'no'}
- tsconfig.json: ${stack.hasTsConfig ? 'yes' : 'no'}
- src directory: ${stack.hasSrcDirectory ? 'yes' : 'no'}
`;
  }

  private runtimeConfig(stack: StackDetectionResult): string {
    const config = {
      version: 1,
      validationFirst: true,
      runtimeAuthority: true,
      allowShellTools: false,
      allowGitTools: false,
      allowNetworkTools: false,
      detectedStack: stack.stacks,
      packageManager: stack.packageManager ?? null,
      createdAt: stack.detectedAt,
    };

    return `${JSON.stringify(config, null, 2)}\n`;
  }

  private renderList(items: readonly string[]): string {
    if (items.length === 0) {
      return '- unknown';
    }

    return items.map((item) => `- ${item}`).join('\n');
  }
}
