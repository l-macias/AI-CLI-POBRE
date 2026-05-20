import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { GitChangeBoundary } from '../git/GitChangeBoundary.js';
import { GitWorkingTreeGuard } from '../git/GitWorkingTreeGuard.js';
import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';
import type { PatchOperation } from '../types/RepairTypes.js';
import { PatchApprovalPolicy } from './PatchApprovalPolicy.js';
import { PatchApplyPlanner } from './PatchApplyPlanner.js';
import { PatchApplyValidator } from './PatchApplyValidator.js';
import { PatchBackupWriter } from './PatchBackupWriter.js';
import { PatchApplyReporter } from './PatchApplyReporter.js';
import { PatchCurrentContentVerifier } from './PatchCurrentContentVerifier.js';
import type {
  PatchApplyContentCheckResult,
  PatchApplyInput,
  PatchApplyIssue,
  PatchApplyOperationResult,
  PatchApplyResult,
} from './PatchApplyTypes.js';

export interface PatchApplyRunnerOptions {
  approvalPolicy?: PatchApprovalPolicy | undefined;
  planner?: PatchApplyPlanner | undefined;
  validator?: PatchApplyValidator | undefined;
  backupWriter?: PatchBackupWriter | undefined;
  reporter?: PatchApplyReporter | undefined;
  gitChangeBoundary?: GitChangeBoundary | undefined;
  currentContentVerifier?: PatchCurrentContentVerifier | undefined;
  pathPolicy?: ProtectedPathPolicy | undefined;
}

export class PatchApplyRunner {
  private readonly approvalPolicy: PatchApprovalPolicy;
  private readonly planner: PatchApplyPlanner;
  private readonly validator: PatchApplyValidator;
  private readonly backupWriter: PatchBackupWriter;
  private readonly reporter: PatchApplyReporter;
  private readonly gitChangeBoundary: GitChangeBoundary;
  private readonly currentContentVerifier: PatchCurrentContentVerifier;
  private readonly pathPolicy: ProtectedPathPolicy;

  public constructor(options: PatchApplyRunnerOptions = {}) {
    this.approvalPolicy = options.approvalPolicy ?? new PatchApprovalPolicy();
    this.planner = options.planner ?? new PatchApplyPlanner();
    this.validator = options.validator ?? new PatchApplyValidator();
    this.backupWriter = options.backupWriter ?? new PatchBackupWriter();
    this.reporter = options.reporter ?? new PatchApplyReporter();
    this.gitChangeBoundary = options.gitChangeBoundary ?? new GitChangeBoundary();
    this.currentContentVerifier =
      options.currentContentVerifier ?? new PatchCurrentContentVerifier();
    this.pathPolicy = options.pathPolicy ?? new ProtectedPathPolicy();
  }

  public async run(input: PatchApplyInput): Promise<PatchApplyResult> {
    const createdAt = new Date().toISOString();
    const applyId = `patch-apply-${createdAt.replaceAll(':', '').replaceAll('.', '')}`;
    const plan = this.planner.plan(input);
    const approvalIssues = input.dryRun === true ? [] : this.approvalPolicy.validateInput(input);

    const issues: PatchApplyIssue[] = [...approvalIssues, ...this.validator.validate(plan)];

    issues.push(...(await this.validateFilesystemPaths(input.projectRoot, plan.operations)));

    const hasBlockingPathIssue = issues.some((issue) => {
      return (
        issue.severity === 'error' &&
        (issue.code.includes('PROTECTED_PATH') ||
          issue.code.includes('PATH_TRAVERSAL') ||
          issue.code.includes('ROOT_ESCAPE') ||
          issue.code.includes('ABSOLUTE_PATH') ||
          issue.code.includes('SECRET_FILE'))
      );
    });

    const contentVerification = hasBlockingPathIssue
      ? {
          checks: [] as PatchApplyContentCheckResult[],
          issues: [] as PatchApplyIssue[],
        }
      : await this.currentContentVerifier.verify({
          projectRoot: input.projectRoot,
          plan,
        });

    issues.push(...contentVerification.issues);

    const boundary = await this.gitChangeBoundary.capture(input.projectRoot);
    const guard = new GitWorkingTreeGuard({
      allowDirtyWorkingTree: input.allowDirtyWorkingTree ?? false,
      allowMissingRepository: input.allowMissingRepository ?? false,
    }).evaluate(boundary);

    if (!guard.allowed) {
      issues.push({
        code: 'PATCH_APPLY_GIT_GUARD_BLOCKED',
        message: guard.reason,
        severity: 'error',
      });
    }

    if (issues.some((issue) => issue.severity === 'error')) {
      const blocked = this.result({
        id: applyId,
        status: 'blocked',
        input,
        plan,
        boundary,
        guard,
        contentChecks: contentVerification.checks,
        operationResults: [],
        issues,
        createdAt,
      });

      await this.reporter.write(blocked);

      return blocked;
    }
    if (input.dryRun === true) {
      const dryRun = this.result({
        id: applyId,
        status: 'dry_run',
        input,
        plan,
        boundary,
        guard,
        contentChecks: contentVerification.checks,
        operationResults: plan.operations.map((operation) => {
          return {
            targetFile: operation.targetFile,
            kind: operation.kind,
            status: 'skipped',
            message: 'Dry run: operation validated but not applied.',
          };
        }),
        issues,
        createdAt,
      });

      await this.reporter.write(dryRun);

      return dryRun;
    }
    const operationResults: PatchApplyOperationResult[] = [];

    try {
      for (const operation of plan.operations) {
        operationResults.push(
          await this.applyOperation({
            applyId,
            projectRoot: input.projectRoot,
            operation,
            backupEnabled: plan.backupEnabled,
          }),
        );
      }

      const applied = this.result({
        id: applyId,
        status: 'applied',
        input,
        plan,
        boundary,
        guard,
        contentChecks: contentVerification.checks,
        operationResults,
        issues,
        createdAt,
      });

      await this.reporter.write(applied);

      return applied;
    } catch (error) {
      issues.push({
        code: 'PATCH_APPLY_FAILED',
        message: error instanceof Error ? error.message : String(error),
        severity: 'error',
      });

      const failed = this.result({
        id: applyId,
        status: 'failed',
        input,
        plan,
        boundary,
        guard,
        contentChecks: contentVerification.checks,
        operationResults,
        issues,
        createdAt,
      });

      await this.reporter.write(failed);

      return failed;
    }
  }

  private async validateFilesystemPaths(
    projectRoot: string,
    operations: readonly PatchOperation[],
  ): Promise<PatchApplyIssue[]> {
    const issues: PatchApplyIssue[] = [];

    for (const operation of operations) {
      const result = await this.pathPolicy.validateTargetWithFilesystem({
        projectRoot,
        targetPath: operation.targetFile,
        operation: 'patch',
        source: 'patch-apply-runner',
      });

      issues.push(
        ...result.findings.map((finding): PatchApplyIssue => {
          return {
            code: this.mapProtectedPathFindingCode(finding.code),
            message: finding.message,
            severity:
              finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
          };
        }),
      );
    }

    return issues;
  }

  private async applyOperation(input: {
    applyId: string;
    projectRoot: string;
    operation: PatchOperation;
    backupEnabled: boolean;
  }): Promise<PatchApplyOperationResult> {
    const pathResult = await this.pathPolicy.validateTargetWithFilesystem({
      projectRoot: input.projectRoot,
      targetPath: input.operation.targetFile,
      operation: 'patch',
      source: 'patch-apply-runner-final-io-gate',
    });

    if (!pathResult.allowed || !pathResult.absoluteTargetPath) {
      const issueCodes = pathResult.findings.map((finding) => finding.code).join(', ');

      throw new Error(
        `Patch apply final path gate blocked ${input.operation.targetFile}: ${issueCodes}`,
      );
    }

    const absoluteTarget = pathResult.absoluteTargetPath;
    const backup = input.backupEnabled
      ? await this.backupWriter.backup({
          projectRoot: input.projectRoot,
          targetFile: input.operation.targetFile,
          applyId: input.applyId,
        })
      : undefined;

    if (input.operation.kind === 'delete_file') {
      await rm(absoluteTarget, {
        force: true,
      });

      return {
        targetFile: input.operation.targetFile,
        kind: input.operation.kind,
        status: 'applied',
        backup,
        message: 'File deleted.',
      };
    }

    if (typeof input.operation.newContent !== 'string') {
      return {
        targetFile: input.operation.targetFile,
        kind: input.operation.kind,
        status: 'failed',
        backup,
        message: 'Operation missing newContent.',
      };
    }

    await mkdir(dirname(absoluteTarget), {
      recursive: true,
    });

    await writeFile(absoluteTarget, input.operation.newContent, 'utf8');

    return {
      targetFile: input.operation.targetFile,
      kind: input.operation.kind,
      status: 'applied',
      backup,
      message: 'File written.',
    };
  }

  private mapProtectedPathFindingCode(code: string): string {
    if (code === 'PROTECTED_PATH_TRAVERSAL_BLOCKED') {
      return 'PATCH_APPLY_PATH_TRAVERSAL';
    }

    if (code === 'PROTECTED_PATH_TARGET_BLOCKED') {
      return 'PATCH_APPLY_PROTECTED_PATH_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_ABSOLUTE_BLOCKED') {
      return 'PATCH_APPLY_ABSOLUTE_PATH_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_ROOT_ESCAPE_BLOCKED') {
      return 'PATCH_APPLY_ROOT_ESCAPE_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_SYMLINK_BLOCKED') {
      return 'PATCH_APPLY_SYMLINK_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_REALPATH_ESCAPE_BLOCKED') {
      return 'PATCH_APPLY_REALPATH_ESCAPE_BLOCKED';
    }

    return `PATCH_APPLY_${code}`;
  }

  private result(input: {
    id: string;
    status: PatchApplyResult['status'];
    input: PatchApplyInput;
    plan: PatchApplyResult['plan'];
    boundary: PatchApplyResult['gitBoundary']['boundary'];
    guard: PatchApplyResult['gitBoundary']['guard'];
    contentChecks: PatchApplyResult['contentChecks'];
    operationResults: PatchApplyOperationResult[];
    issues: PatchApplyIssue[];
    createdAt: string;
  }): PatchApplyResult {
    return {
      id: input.id,
      status: input.status,
      projectRoot: input.input.projectRoot,
      proposalId: input.input.proposal.id,
      gitBoundary: {
        boundary: input.boundary,
        guard: input.guard,
        safeToWrite: input.guard.allowed,
      },
      plan: input.plan,
      contentChecks: input.contentChecks,
      operationResults: input.operationResults,
      issues: input.issues,
      createdAt: input.createdAt,
      completedAt: new Date().toISOString(),
    };
  }
}
