import type { PatchFailureReport } from './PatchFailureReport.js';
import type { RuntimePatchProposal } from './PatchProposal.js';

export interface PatchRepairPromptInput {
  originalObjective: string;
  proposal: RuntimePatchProposal;
  failureReport: PatchFailureReport;
  maxAttempts: number;
  currentAttempt: number;
}

export interface PatchRepairPrompt {
  system: string;
  user: string;
  constraints: string[];
  metadata: {
    proposalId: string;
    failureReportId: string;
    sessionId: string;
    currentAttempt: number;
    maxAttempts: number;
  };
}

export class PatchRepairPromptBuilder {
  public build(input: PatchRepairPromptInput): PatchRepairPrompt {
    if (input.currentAttempt < 1) {
      throw new Error('Patch repair prompt currentAttempt must be greater than zero.');
    }

    if (input.currentAttempt > input.maxAttempts) {
      throw new Error('Patch repair prompt currentAttempt cannot exceed maxAttempts.');
    }

    const constraints = [
      'Return only a corrected patch proposal payload that matches the runtime patch schema.',
      'Modify only files that were present in the failed proposal unless runtime context explicitly allows more.',
      'Do not touch .env, secrets, database migrations, dependency files, build outputs or protected paths.',
      'Do not apply files directly.',
      'Do not ask the user to run manual fixes.',
      'Preserve the original objective unless the failure report proves it unsafe.',
      'Fix the verification failure with the smallest safe change.',
    ];

    return {
      system: [
        'You are a patch repair provider inside Zero Runtime.',
        'The runtime is the authority.',
        'You propose corrected structured patch data only.',
        'The runtime will validate, diff, sandbox-verify and require approval before real apply.',
      ].join('\n'),
      user: [
        `Original objective: ${input.originalObjective}`,
        '',
        `Repair attempt: ${input.currentAttempt}/${input.maxAttempts}`,
        '',
        `Failed proposal id: ${input.proposal.id}`,
        `Failure report id: ${input.failureReport.id}`,
        `Sandbox status: ${input.failureReport.sandboxStatus}`,
        `Apply status: ${input.failureReport.applyStatus}`,
        '',
        'Failed files:',
        ...input.failureReport.failedFiles.map((file) => `- ${file}`),
        '',
        'Sandbox issues:',
        ...(input.failureReport.sandboxIssues.length > 0
          ? input.failureReport.sandboxIssues.map((issue) => `- ${issue.code}: ${issue.message}`)
          : ['- none']),
        '',
        'Verify failures:',
        ...(input.failureReport.verifyFailures.length > 0
          ? input.failureReport.verifyFailures.flatMap((failure) => [
              `- Command: ${failure.command}`,
              `  Status: ${failure.status}`,
              `  Exit code: ${failure.exitCode ?? 'n/a'}`,
              `  Stdout: ${failure.stdoutSummary || 'empty'}`,
              `  Stderr: ${failure.stderrSummary || 'empty'}`,
              `  Issues: ${
                failure.issues.length > 0
                  ? failure.issues.map((issue) => `${issue.code}: ${issue.message}`).join(' | ')
                  : 'none'
              }`,
            ])
          : ['- none']),
        '',
        'Original patch file summaries:',
        ...input.failureReport.originalPatchSummary.files.flatMap((file) => [
          `- ${file.path}`,
          `  Operation: ${file.operation}`,
          `  Risk: ${file.riskLevel}`,
          `  Reason: ${file.reason}`,
          `  Changes: ${file.changesSummary.join(' | ')}`,
        ]),
        '',
        'Produce a corrected proposal that fixes the failure while staying inside constraints.',
      ].join('\n'),
      constraints,
      metadata: {
        proposalId: input.proposal.id,
        failureReportId: input.failureReport.id,
        sessionId: input.proposal.sessionId,
        currentAttempt: input.currentAttempt,
        maxAttempts: input.maxAttempts,
      },
    };
  }
}
