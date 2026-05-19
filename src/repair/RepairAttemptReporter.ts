import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type { RepairAttemptResult } from '../types/RepairTypes.js';

export interface RepairAttemptReporterOptions {
  outputPath?: string | undefined;
  redactor?: SensitiveDataRedactor | undefined;
}

export class RepairAttemptReporter {
  private readonly outputPath: string;
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: RepairAttemptReporterOptions = {}) {
    this.outputPath = resolve(options.outputPath ?? '.runtime/real-project-trial.md');
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public toMarkdown(result: RepairAttemptResult): string {
    const steps = result.steps
      .map((step) => {
        return `- [${step.status}] ${step.id}: ${step.description}`;
      })
      .join('\n');

    const blockers =
      result.blockers.length > 0
        ? result.blockers.map((blocker) => `- ${blocker}`).join('\n')
        : '- none';

    const failures =
      result.failures.length > 0
        ? result.failures.map((failure) => `- ${failure}`).join('\n')
        : '- none';

    const findings = result.request.findings
      .map((finding) => {
        return `- ${finding.source}: ${finding.relatedFile ?? 'unknown'}:${
          finding.line ?? '?'
        }:${finding.column ?? '?'} — ${finding.message}`;
      })
      .join('\n');

    const targets = result.request.targetFiles
      .map((file) => {
        return `- ${file.relativePath} (${file.bytes} bytes)`;
      })
      .join('\n');

    const operations =
      result.proposal?.operations
        .map((operation) => {
          return `- ${operation.kind}: ${operation.targetFile} — ${operation.reason}`;
        })
        .join('\n') ?? '- none';

    const diffPreviews =
      result.diffPreviews.length > 0
        ? result.diffPreviews
            .map((preview) => {
              return `## Diff Preview — ${preview.targetFile}

- Changed: ${String(preview.changed)}
- Changed lines: ${preview.changedLines}

${preview.markdown}`;
            })
            .join('\n\n')
        : 'No diff previews generated.';

    const patchIssues =
      result.patchValidation.issues.length > 0
        ? result.patchValidation.issues
            .map((issue) => {
              return `- [${issue.severity}] ${issue.code}: ${issue.message}`;
            })
            .join('\n')
        : '- none';

    const markdown = `# Real Project Trial

## Objective tested

${result.objective}

## Status

- Attempt ID: ${result.id}
- Status: ${result.status}
- Project root: ${result.projectRoot}
- Created: ${result.createdAt}
- Completed: ${result.completedAt}

## Plan generated

The runtime generated a repair request and prompt. The repair proposal was provided by a repair proposal provider.

## Steps executed

${steps || '- none'}

## Findings

${findings || '- none'}

## Target files

${targets || '- none'}

## Patch proposal

- Summary: ${result.proposal?.summary ?? 'none'}
- Risk level: ${result.proposal?.riskLevel ?? 'none'}

### Operations

${operations}

## Patch validation

- Valid: ${String(result.patchValidation.valid)}

${patchIssues}

${diffPreviews}

## Blockers

${blockers}

## Failures

${failures}

## Cost estimate

- Provider: ${result.modelUsage?.provider ?? 'none'}
- Model: ${result.modelUsage?.model ?? 'none'}
- Prompt tokens: ${result.modelUsage?.promptTokens ?? 0}
- Completion tokens: ${result.modelUsage?.completionTokens ?? 0}
- Total tokens: ${result.modelUsage?.totalTokens ?? 0}
- Estimated USD: ${result.modelUsage?.estimatedUsd ?? 0}
## Model policy

- Allowed: ${String(result.modelPolicyDecision?.allowed ?? false)}
- Status: ${result.modelPolicyDecision?.status ?? 'none'}
- Provider requested: ${result.modelPolicyDecision?.provider ?? 'none'}
- Selected provider: ${result.modelPolicyDecision?.selectedProvider ?? 'none'}
- Selected model: ${result.modelPolicyDecision?.selectedModel ?? 'none'}
- Requires premium approval: ${String(result.modelPolicyDecision?.requiresPremiumApproval ?? false)}
- Fallback used: ${String(result.providerFallbackUsed ?? false)}
- Fallback reason: ${result.providerFallbackReason ?? 'none'}

### Model policy issues

${
  result.modelPolicyDecision?.issues.length
    ? result.modelPolicyDecision.issues
        .map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}`)
        .join('\n')
    : '- none'
}
## Improvements needed

- Connect repair proposal provider to the real LLM provider policy.
- Add patch proposal parser for model JSON output.
- Add approval gate before controlled write.
- Add post-write revalidation.
- Add multi-file related context expansion.

## Notes

No files were written in this phase. The runtime only prepared and validated a repair proposal.
`;

    const redacted = this.redactor.redact(markdown);

    return typeof redacted === 'string' ? redacted : JSON.stringify(redacted, null, 2);
  }

  public async write(result: RepairAttemptResult): Promise<string> {
    const markdown = this.toMarkdown(result);

    await mkdir(dirname(this.outputPath), {
      recursive: true,
    });

    await writeFile(this.outputPath, markdown, 'utf8');

    return this.outputPath;
  }
}
