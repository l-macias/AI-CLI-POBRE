import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import type { RuntimePatchProposal } from './PatchProposal.js';

export type PatchFailureReportStatus = 'failed' | 'blocked';

export interface PatchFailureVerifyFailure {
  command: string;
  status: 'executed' | 'blocked' | 'failed';
  exitCode?: number | undefined;
  stdoutSummary: string;
  stderrSummary: string;
  issues: {
    code: string;
    message: string;
    severity: 'warning' | 'error';
  }[];
}

export interface PatchFailureReport {
  id: string;
  status: PatchFailureReportStatus;
  proposalId: string;
  planId: string;
  sessionId: string;
  projectRoot: string;
  summary: string;
  failedFiles: string[];
  sandboxResultId: string;
  sandboxStatus: PatchSandboxResult['status'];
  sandboxIssues: PatchSandboxResult['issues'];
  applyStatus: NonNullable<PatchSandboxResult['applyResult']>['status'] | 'not_applied';
  verifyFailures: PatchFailureVerifyFailure[];
  originalPatchSummary: {
    fileCount: number;
    riskLevel: RuntimePatchProposal['riskLevel'];
    files: {
      path: string;
      operation: string;
      riskLevel: string;
      reason: string;
      changesSummary: string[];
    }[];
  };
  createdAt: string;
}

export class PatchFailureReportBuilder {
  public build(input: {
    proposal: RuntimePatchProposal;
    sandboxResult: PatchSandboxResult;
  }): PatchFailureReport {
    if (input.sandboxResult.status === 'passed') {
      throw new Error('Patch failure report requires a failed or blocked sandbox result.');
    }

    const createdAt = new Date().toISOString();

    return {
      id: `patch-failure-${createdAt.replaceAll(':', '').replaceAll('.', '')}`,
      status: input.sandboxResult.status === 'blocked' ? 'blocked' : 'failed',
      proposalId: input.proposal.id,
      planId: input.proposal.planId,
      sessionId: input.proposal.sessionId,
      projectRoot: input.proposal.projectRoot,
      summary: this.buildSummary(input.sandboxResult),
      failedFiles: input.proposal.files.map((file) => file.path),
      sandboxResultId: input.sandboxResult.id,
      sandboxStatus: input.sandboxResult.status,
      sandboxIssues: input.sandboxResult.issues,
      applyStatus: input.sandboxResult.applyResult?.status ?? 'not_applied',
      verifyFailures: input.sandboxResult.verifyRuns
        .filter((run) => {
          return run.status === 'blocked' || run.status === 'failed' || run.exitCode !== 0;
        })
        .map((run) => ({
          command: run.command,
          status: run.status,
          ...(run.exitCode !== undefined ? { exitCode: run.exitCode } : {}),
          stdoutSummary: run.stdoutSummary,
          stderrSummary: run.stderrSummary,
          issues: run.issues,
        })),
      originalPatchSummary: {
        fileCount: input.proposal.files.length,
        riskLevel: input.proposal.riskLevel,
        files: input.proposal.files.map((file) => ({
          path: file.path,
          operation: file.operation,
          riskLevel: file.riskLevel,
          reason: file.reason,
          changesSummary: file.changesSummary,
        })),
      },
      createdAt,
    };
  }

  private buildSummary(result: PatchSandboxResult): string {
    if (result.status === 'blocked') {
      return 'Sandbox verification was blocked by runtime policy.';
    }

    const failedVerifyCount = result.verifyRuns.filter((run) => {
      return run.status === 'failed' || run.status === 'blocked' || run.exitCode !== 0;
    }).length;

    if (failedVerifyCount > 0) {
      return `Sandbox verification failed with ${failedVerifyCount} failing verify command(s).`;
    }

    return 'Sandbox verification failed before verify commands completed.';
  }
}
