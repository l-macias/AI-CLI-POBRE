import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import type { PatchApplyIssue } from '../patch-apply/PatchApplyTypes.js';
import { PatchApplySafetyGuard } from '../patches/PatchApplySafetyGuard.js';
import type { PatchSandboxInput, PatchSandboxIssue, PatchSandboxResult } from './SandboxResult.js';
import { SandboxPatchApplier } from './SandboxPatchApplier.js';
import { SandboxVerifyRunner } from './SandboxVerifyRunner.js';
import { SandboxWorkspaceManager } from './SandboxWorkspaceManager.js';

export interface PatchSandboxOptions {
  workspaceManager?: SandboxWorkspaceManager | undefined;
  patchApplier?: SandboxPatchApplier | undefined;
  verifyRunner?: SandboxVerifyRunner | undefined;
  diffBuilder?: PatchDiffBuilder | undefined;
  safetyGuard?: PatchApplySafetyGuard | undefined;
  cleanup?: boolean | undefined;
}

export class PatchSandbox {
  private readonly workspaceManager: SandboxWorkspaceManager;
  private readonly patchApplier: SandboxPatchApplier;
  private readonly verifyRunner: SandboxVerifyRunner;
  private readonly diffBuilder: PatchDiffBuilder;
  private readonly safetyGuard: PatchApplySafetyGuard;
  private readonly cleanupEnabled: boolean;

  public constructor(options: PatchSandboxOptions = {}) {
    this.workspaceManager = options.workspaceManager ?? new SandboxWorkspaceManager();
    this.patchApplier = options.patchApplier ?? new SandboxPatchApplier();
    this.verifyRunner = options.verifyRunner ?? new SandboxVerifyRunner();
    this.diffBuilder = options.diffBuilder ?? new PatchDiffBuilder();
    this.safetyGuard = options.safetyGuard ?? new PatchApplySafetyGuard();
    this.cleanupEnabled = options.cleanup ?? false;
  }

  public async verify(input: PatchSandboxInput): Promise<PatchSandboxResult> {
    const startedAt = new Date().toISOString();
    const id = `patch-sandbox-${startedAt.replaceAll(':', '').replaceAll('.', '')}`;
    const issues: PatchSandboxIssue[] = [];
    let workspace = null as PatchSandboxResult['workspace'];
    let applyResult = null as PatchSandboxResult['applyResult'];
    let verifyRuns: PatchSandboxResult['verifyRuns'] = [];

    try {
      const diff = this.diffBuilder.build({
        proposal: input.proposal,
      }).diff;

      const safety = this.safetyGuard.validate({
        proposal: input.proposal,
        diff,
      });

      if (!safety.allowed) {
        return this.result({
          id,
          status: 'blocked',
          input,
          workspace,
          applyResult,
          verifyRuns,
          issues: safety.issues.map((issue) => ({
            code: issue.code,
            message: issue.message,
            severity: 'error',
          })),
          startedAt,
        });
      }

      workspace = await this.workspaceManager.create(input.proposal);

      applyResult = await this.patchApplier.apply({
        proposal: input.proposal,
        diff,
        workspace,
      });

      if (applyResult.status !== 'applied') {
        issues.push(...this.applyIssuesToSandboxIssues(applyResult.issues), {
          code: 'SANDBOX_PATCH_APPLY_NOT_APPLIED',
          message: `Sandbox patch apply finished with status ${applyResult.status}.`,
          severity: 'error',
        });

        return this.result({
          id,
          status: applyResult.status === 'blocked' ? 'blocked' : 'failed',
          input,
          workspace,
          applyResult,
          verifyRuns,
          issues,
          startedAt,
        });
      }

      verifyRuns = await this.verifyRunner.run({
        workspace,
        commands: input.verifyCommands,
        approvalState: input.approvalState,
      });

      const blockedVerify = verifyRuns.some((run) => run.status === 'blocked');
      const failedVerify = verifyRuns.some(
        (run) => run.status === 'failed' || (run.status === 'executed' && run.exitCode !== 0),
      );

      if (blockedVerify || failedVerify) {
        return this.result({
          id,
          status: blockedVerify ? 'blocked' : 'failed',
          input,
          workspace,
          applyResult,
          verifyRuns,
          issues: [
            ...issues,
            ...verifyRuns.flatMap((run) =>
              run.issues.map((issue) => ({
                code: issue.code,
                message: issue.message,
                severity: issue.severity,
              })),
            ),
            ...(failedVerify
              ? [
                  {
                    code: 'SANDBOX_VERIFY_FAILED',
                    message: 'One or more sandbox verify commands failed.',
                    severity: 'error' as const,
                  },
                ]
              : []),
          ],
          startedAt,
        });
      }

      return this.result({
        id,
        status: 'passed',
        input,
        workspace,
        applyResult,
        verifyRuns,
        issues,
        startedAt,
      });
    } catch (error) {
      return this.result({
        id,
        status: 'failed',
        input,
        workspace,
        applyResult,
        verifyRuns,
        issues: [
          ...issues,
          {
            code: 'SANDBOX_FAILED',
            message: error instanceof Error ? error.message : String(error),
            severity: 'error',
          },
        ],
        startedAt,
      });
    } finally {
      if (this.cleanupEnabled && workspace) {
        await this.workspaceManager.cleanup(workspace);
      }
    }
  }

  private applyIssuesToSandboxIssues(issues: PatchApplyIssue[]): PatchSandboxIssue[] {
    return issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      severity: issue.severity === 'info' ? 'warning' : issue.severity,
    }));
  }

  private result(input: {
    id: string;
    status: PatchSandboxResult['status'];
    input: PatchSandboxInput;
    workspace: PatchSandboxResult['workspace'];
    applyResult: PatchSandboxResult['applyResult'];
    verifyRuns: PatchSandboxResult['verifyRuns'];
    issues: PatchSandboxIssue[];
    startedAt: string;
  }): PatchSandboxResult {
    return {
      id: input.id,
      status: input.status,
      proposalId: input.input.proposal.id,
      sessionId: input.input.proposal.sessionId,
      projectRoot: input.input.proposal.projectRoot,
      workspace: input.workspace,
      applyResult: input.applyResult,
      verifyRuns: input.verifyRuns,
      issues: input.issues,
      startedAt: input.startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}
