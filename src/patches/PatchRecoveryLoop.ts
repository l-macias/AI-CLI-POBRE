import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import { PatchFailureReportBuilder, type PatchFailureReport } from './PatchFailureReport.js';
import { PatchRepairPromptBuilder, type PatchRepairPrompt } from './PatchRepairPromptBuilder.js';
import type { RuntimePatchProposal } from './PatchProposal.js';

export type PatchRecoveryLoopStatus =
  | 'repair_prompt_ready'
  | 'max_attempts_reached'
  | 'not_recoverable';

export interface PatchRecoveryAttempt {
  attemptNumber: number;
  proposalId: string;
  sandboxResultId: string;
  failureReport: PatchFailureReport;
  repairPrompt: PatchRepairPrompt;
  createdAt: string;
}

export interface PatchRecoveryLoopInput {
  originalObjective: string;
  proposal: RuntimePatchProposal;
  sandboxResult: PatchSandboxResult;
  currentAttempt: number;
  maxAttempts: number;
}

export interface PatchRecoveryLoopResult {
  id: string;
  status: PatchRecoveryLoopStatus;
  proposalId: string;
  sessionId: string;
  currentAttempt: number;
  maxAttempts: number;
  attempts: PatchRecoveryAttempt[];
  issues: {
    code: string;
    message: string;
    severity: 'warning' | 'error';
  }[];
  createdAt: string;
}

export interface PatchRecoveryLoopOptions {
  failureReportBuilder?: PatchFailureReportBuilder | undefined;
  repairPromptBuilder?: PatchRepairPromptBuilder | undefined;
}

export class PatchRecoveryLoop {
  private readonly failureReportBuilder: PatchFailureReportBuilder;
  private readonly repairPromptBuilder: PatchRepairPromptBuilder;

  public constructor(options: PatchRecoveryLoopOptions = {}) {
    this.failureReportBuilder = options.failureReportBuilder ?? new PatchFailureReportBuilder();
    this.repairPromptBuilder = options.repairPromptBuilder ?? new PatchRepairPromptBuilder();
  }

  public prepareRepair(input: PatchRecoveryLoopInput): PatchRecoveryLoopResult {
    const createdAt = new Date().toISOString();
    const issues = this.validateInput(input);

    if (issues.some((issue) => issue.severity === 'error')) {
      return {
        id: this.createId(createdAt),
        status: 'not_recoverable',
        proposalId: input.proposal.id,
        sessionId: input.proposal.sessionId,
        currentAttempt: input.currentAttempt,
        maxAttempts: input.maxAttempts,
        attempts: [],
        issues,
        createdAt,
      };
    }

    if (input.currentAttempt > input.maxAttempts) {
      return {
        id: this.createId(createdAt),
        status: 'max_attempts_reached',
        proposalId: input.proposal.id,
        sessionId: input.proposal.sessionId,
        currentAttempt: input.currentAttempt,
        maxAttempts: input.maxAttempts,
        attempts: [],
        issues: [
          {
            code: 'PATCH_RECOVERY_MAX_ATTEMPTS_REACHED',
            message: `Patch recovery reached max attempts: ${input.maxAttempts}.`,
            severity: 'error',
          },
        ],
        createdAt,
      };
    }

    const failureReport = this.failureReportBuilder.build({
      proposal: input.proposal,
      sandboxResult: input.sandboxResult,
    });

    const repairPrompt = this.repairPromptBuilder.build({
      originalObjective: input.originalObjective,
      proposal: input.proposal,
      failureReport,
      currentAttempt: input.currentAttempt,
      maxAttempts: input.maxAttempts,
    });

    return {
      id: this.createId(createdAt),
      status: 'repair_prompt_ready',
      proposalId: input.proposal.id,
      sessionId: input.proposal.sessionId,
      currentAttempt: input.currentAttempt,
      maxAttempts: input.maxAttempts,
      attempts: [
        {
          attemptNumber: input.currentAttempt,
          proposalId: input.proposal.id,
          sandboxResultId: input.sandboxResult.id,
          failureReport,
          repairPrompt,
          createdAt,
        },
      ],
      issues,
      createdAt,
    };
  }

  private validateInput(input: PatchRecoveryLoopInput): PatchRecoveryLoopResult['issues'] {
    const issues: PatchRecoveryLoopResult['issues'] = [];

    if (input.originalObjective.trim().length === 0) {
      issues.push({
        code: 'PATCH_RECOVERY_OBJECTIVE_REQUIRED',
        message: 'Patch recovery requires the original objective.',
        severity: 'error',
      });
    }

    if (input.currentAttempt < 1) {
      issues.push({
        code: 'PATCH_RECOVERY_ATTEMPT_INVALID',
        message: 'Patch recovery currentAttempt must be greater than zero.',
        severity: 'error',
      });
    }

    if (input.maxAttempts < 1) {
      issues.push({
        code: 'PATCH_RECOVERY_MAX_ATTEMPTS_INVALID',
        message: 'Patch recovery maxAttempts must be greater than zero.',
        severity: 'error',
      });
    }

    if (input.sandboxResult.status === 'passed') {
      issues.push({
        code: 'PATCH_RECOVERY_REQUIRES_FAILED_SANDBOX',
        message: 'Patch recovery requires a failed or blocked sandbox result.',
        severity: 'error',
      });
    }

    if (input.sandboxResult.proposalId !== input.proposal.id) {
      issues.push({
        code: 'PATCH_RECOVERY_PROPOSAL_MISMATCH',
        message: 'Patch recovery sandbox result proposalId does not match proposal id.',
        severity: 'error',
      });
    }

    if (input.sandboxResult.sessionId !== input.proposal.sessionId) {
      issues.push({
        code: 'PATCH_RECOVERY_SESSION_MISMATCH',
        message: 'Patch recovery sandbox result sessionId does not match proposal sessionId.',
        severity: 'error',
      });
    }

    return issues;
  }

  private createId(createdAt: string): string {
    return `patch-recovery-${createdAt.replaceAll(':', '').replaceAll('.', '')}`;
  }
}
