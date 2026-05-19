import type {
  ScaffoldIntent,
  ScaffoldProjectConvention,
  ScaffoldRequest,
  ScaffoldRequestConstraint,
} from './ScaffoldTypes.js';

export interface ScaffoldRequestBuilderInput {
  projectRoot: string;
  objective?: string | undefined;
  intent: ScaffoldIntent;
  convention: ScaffoldProjectConvention;
}

export class ScaffoldRequestBuilder {
  public build(input: ScaffoldRequestBuilderInput): ScaffoldRequest {
    const createdAt = new Date().toISOString();
    const constraints = this.buildConstraints(input.intent, input.convention);

    return {
      id: `scaffold-request-${createdAt.replaceAll(':', '').replaceAll('.', '')}`,
      projectRoot: input.projectRoot,
      objective:
        input.objective ??
        `Scaffold ${input.intent.moduleKind} module "${input.intent.normalizedName}" at ${input.intent.normalizedTargetPath}.`,
      intent: input.intent,
      convention: input.convention,
      constraints,
      expectedOutput: {
        format: 'json_scaffold_proposal',
        requireFileTree: true,
        requireExplanation: true,
        requireRiskAssessment: true,
        allowedOperations: ['create_file', 'replace_file'],
      },
      createdAt,
    };
  }

  private buildConstraints(
    intent: ScaffoldIntent,
    convention: ScaffoldProjectConvention,
  ): ScaffoldRequestConstraint[] {
    const constraints: ScaffoldRequestConstraint[] = [
      {
        code: 'SCAFFOLD_NO_DIRECT_WRITES',
        description:
          'Scaffolding must produce a proposal only. Runtime will validate, show diff, request approval, and apply through PatchApplyRunner.',
        severity: 'error',
      },
      {
        code: 'SCAFFOLD_RESPECT_TARGET_PATH',
        description: `All generated files must stay under ${intent.normalizedTargetPath}.`,
        severity: 'error',
      },
      {
        code: 'SCAFFOLD_NO_PROTECTED_PATHS',
        description:
          'Generated file paths must not target protected files, runtime state, secrets, build outputs, node_modules, or .git.',
        severity: 'error',
      },
      {
        code: 'SCAFFOLD_NO_SECRET_CONTENT',
        description:
          'Generated files must not include API keys, tokens, credentials, private keys, or placeholder secrets that look real.',
        severity: 'error',
      },
      {
        code: 'SCAFFOLD_MATCH_PROJECT_CONVENTIONS',
        description: `Respect detected stack and project conventions: ${convention.detectedStack.join(', ') || 'unknown'}.`,
        severity: 'warning',
      },
    ];

    if (!intent.overwriteExisting) {
      constraints.push({
        code: 'SCAFFOLD_NO_OVERWRITE_WITHOUT_OPT_IN',
        description:
          'Do not replace existing files unless overwriteExisting is explicitly enabled and runtime validation confirms it.',
        severity: 'error',
      });
    }

    if (convention.hasTypeScript) {
      constraints.push({
        code: 'SCAFFOLD_TYPESCRIPT_STRICT',
        description:
          'Prefer strict TypeScript, explicit exports, ESM-compatible imports, and no unsafe any.',
        severity: 'warning',
      });
    }

    if (intent.provider === 'openrouter') {
      constraints.push({
        code: 'SCAFFOLD_PROVIDER_NOT_AUTHORITY',
        description:
          'Real provider output is only a proposal. It does not authorize writes, patch apply, shell commands, approvals, or premium usage.',
        severity: 'error',
      });
    }

    return constraints;
  }
}
