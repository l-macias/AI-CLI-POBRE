import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { VerifyCommandPolicy, type VerifyCommandApprovalState } from './VerifyCommandPolicy.js';

export interface VerifyRunnerOptions {
  policy?: VerifyCommandPolicy | undefined;
  timeoutMs?: number | undefined;
  maxOutputChars?: number | undefined;
}

export interface VerifyRunInput {
  command: string;
  args: string[];
  cwd: string;
  approvalState: VerifyCommandApprovalState;
}

export interface VerifyRunResult {
  command: string;
  cwd: string;
  status: 'executed' | 'blocked' | 'failed';
  exitCode?: number | undefined;
  stdoutSummary: string;
  stderrSummary: string;
  issues: {
    code: string;
    message: string;
    severity: 'warning' | 'error';
  }[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export class VerifyRunner {
  private readonly policy: VerifyCommandPolicy;
  private readonly timeoutMs: number;
  private readonly maxOutputChars: number;

  public constructor(options: VerifyRunnerOptions = {}) {
    this.policy = options.policy ?? new VerifyCommandPolicy();
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxOutputChars = options.maxOutputChars ?? 4_000;
  }

  public async run(input: VerifyRunInput): Promise<VerifyRunResult> {
    const startedAtDate = new Date();
    const startedAt = startedAtDate.toISOString();
    const cwd = resolve(input.cwd);
    const policyResult = this.policy.evaluate({
      command: input.command,
      args: input.args,
      cwd,
      approvalState: input.approvalState,
    });

    if (!policyResult.allowed) {
      const completedAt = new Date();

      return {
        command: policyResult.normalizedCommand,
        cwd,
        status: 'blocked',
        stdoutSummary: '',
        stderrSummary: '',
        issues: policyResult.issues,
        startedAt,
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAtDate.getTime(),
      };
    }

    return this.execute({
      command: input.command,
      args: input.args,
      cwd,
      normalizedCommand: policyResult.normalizedCommand,
      startedAt,
      startedAtDate,
      policyIssues: policyResult.issues,
    });
  }

  private async execute(input: {
    command: string;
    args: string[];
    cwd: string;
    normalizedCommand: string;
    startedAt: string;
    startedAtDate: Date;
    policyIssues: VerifyRunResult['issues'];
  }): Promise<VerifyRunResult> {
    return new Promise<VerifyRunResult>((resolveRun) => {
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];

      const child = spawn(input.command, input.args, {
        cwd: input.cwd,
        shell: process.platform === 'win32',
        windowsHide: true,
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
      }, this.timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutChunks.push(chunk.toString('utf8'));
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk.toString('utf8'));
      });

      child.on('error', (error) => {
        clearTimeout(timeout);

        const completedAt = new Date();

        resolveRun({
          command: input.normalizedCommand,
          cwd: input.cwd,
          status: 'failed',
          stdoutSummary: this.summarize(stdoutChunks.join('')),
          stderrSummary: this.summarize(error.message),
          issues: [
            ...input.policyIssues,
            {
              code: 'VERIFY_COMMAND_EXECUTION_ERROR',
              message: error.message,
              severity: 'error',
            },
          ],
          startedAt: input.startedAt,
          completedAt: completedAt.toISOString(),
          durationMs: completedAt.getTime() - input.startedAtDate.getTime(),
        });
      });

      child.on('close', (exitCode) => {
        clearTimeout(timeout);

        const completedAt = new Date();

        resolveRun({
          command: input.normalizedCommand,
          cwd: input.cwd,
          status: 'executed',
          exitCode: exitCode ?? undefined,
          stdoutSummary: this.summarize(stdoutChunks.join('')),
          stderrSummary: this.summarize(stderrChunks.join('')),
          issues: input.policyIssues,
          startedAt: input.startedAt,
          completedAt: completedAt.toISOString(),
          durationMs: completedAt.getTime() - input.startedAtDate.getTime(),
        });
      });
    });
  }

  private summarize(output: string): string {
    const trimmed = output.trim();

    if (trimmed.length <= this.maxOutputChars) {
      return trimmed;
    }

    return `${trimmed.slice(0, this.maxOutputChars)}\n... output truncated ...`;
  }
}
