import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { normalize, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type {
  RealProjectTrialSafetyIssue,
  RealProjectTrialValidationCommand,
  RealProjectTrialValidationResult,
} from '../types/RealProjectTrialTypes.js';

const execFileAsync = promisify(execFile);

export interface RealProjectTrialCommandRunnerOptions {
  redactor?: SensitiveDataRedactor | undefined;
}

interface ExecFileError extends Error {
  code?: number | string | undefined;
  stdout?: string | Buffer | undefined;
  stderr?: string | Buffer | undefined;
  killed?: boolean | undefined;
  signal?: string | undefined;
}

interface ResolvedCommand {
  executable: string;
  args: string[];
}

const allowedScripts = new Set(['build', 'typecheck', 'lint']);

export class RealProjectTrialCommandRunner {
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: RealProjectTrialCommandRunnerOptions = {}) {
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public async run(input: {
    projectRoot: string;
    command: RealProjectTrialValidationCommand;
  }): Promise<RealProjectTrialValidationResult> {
    const startedAt = new Date();
    const issues = this.validateCommand(input.projectRoot, input.command);

    if (issues.some((issue) => issue.severity === 'error')) {
      const finishedAt = new Date();

      return {
        commandId: input.command.id,
        scriptName: input.command.scriptName,
        command: input.command.command,
        args: [...input.command.args],
        status: 'blocked',
        stdout: '',
        stderr: '',
        outputBytes: 0,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        issues,
      };
    }

    if (input.command.kind === 'noop') {
      const finishedAt = new Date();

      return {
        commandId: input.command.id,
        scriptName: input.command.scriptName,
        command: input.command.command,
        args: [],
        status: 'skipped',
        stdout: '',
        stderr: input.command.reason,
        outputBytes: 0,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        issues: [
          {
            code: 'NO_SAFE_VALIDATION_COMMAND',
            message: input.command.reason,
            severity: 'warning',
          },
        ],
      };
    }

    try {
      const resolvedCommand = this.resolveCommand(input.command);

      const result = await execFileAsync(resolvedCommand.executable, resolvedCommand.args, {
        cwd: input.projectRoot,
        shell: false,
        timeout: input.command.timeoutMs,
        maxBuffer: input.command.maxOutputBytes,
        env: {
          ...this.createSafeEnvironment(),
          NODE_ENV: 'production',
          NEXT_TELEMETRY_DISABLED: '1',
        },
      });

      const finishedAt = new Date();
      const stdout = this.sanitizeOutput(result.stdout);
      const stderr = this.sanitizeOutput(result.stderr);

      return {
        commandId: input.command.id,
        scriptName: input.command.scriptName,
        command: input.command.command,
        args: [...input.command.args],
        status: 'passed',
        exitCode: 0,
        stdout,
        stderr,
        outputBytes: Buffer.byteLength(`${stdout}\n${stderr}`, 'utf8'),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        issues,
      };
    } catch (error) {
      const finishedAt = new Date();
      const execError = error as ExecFileError;

      const rawStdout = this.toText(execError.stdout);
      const rawStderr = this.toText(execError.stderr);
      const rawMessage = execError.message;

      const stdout = this.sanitizeOutput(rawStdout);
      const stderr = this.sanitizeOutput(
        [rawStderr, rawMessage].filter((value) => value.trim().length > 0).join('\n'),
      );

      const timedOut = execError.killed === true || execError.signal === 'SIGTERM';

      return {
        commandId: input.command.id,
        scriptName: input.command.scriptName,
        command: input.command.command,
        args: [...input.command.args],
        status: timedOut ? 'timeout' : 'failed',
        exitCode: typeof execError.code === 'number' ? execError.code : undefined,
        stdout,
        stderr,
        outputBytes: Buffer.byteLength(`${stdout}\n${stderr}`, 'utf8'),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        issues: [
          ...issues,
          {
            code: timedOut ? 'VALIDATION_COMMAND_TIMEOUT' : 'VALIDATION_COMMAND_FAILED',
            message: this.sanitizeOutput(execError.message),
            severity: 'error',
          },
        ],
      };
    }
  }

  private validateCommand(
    projectRoot: string,
    command: RealProjectTrialValidationCommand,
  ): RealProjectTrialSafetyIssue[] {
    const issues: RealProjectTrialSafetyIssue[] = [];

    if (command.kind === 'npm_script') {
      this.validateNpmScriptCommand(command, issues);
    } else if (command.kind === 'node_binary') {
      this.validateNodeBinaryCommand(projectRoot, command, issues);
    } else if (command.kind !== 'noop') {
      issues.push({
        code: 'VALIDATION_COMMAND_KIND_NOT_ALLOWED',
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        message: `Validation command kind is not allowed: ${command.kind}`,
        severity: 'error',
      });
    }

    if (command.timeoutMs <= 0 || command.timeoutMs > 180_000) {
      issues.push({
        code: 'VALIDATION_TIMEOUT_INVALID',
        message: 'Validation timeout must be between 1ms and 180000ms.',
        severity: 'error',
      });
    }

    if (command.maxOutputBytes <= 0 || command.maxOutputBytes > 200_000) {
      issues.push({
        code: 'VALIDATION_OUTPUT_LIMIT_INVALID',
        message: 'Validation output limit must be between 1 and 200000 bytes.',
        severity: 'error',
      });
    }

    return issues;
  }

  private validateNpmScriptCommand(
    command: RealProjectTrialValidationCommand,
    issues: RealProjectTrialSafetyIssue[],
  ): void {
    if (command.command !== 'npm') {
      issues.push({
        code: 'VALIDATION_COMMAND_NOT_ALLOWED',
        message: `Only npm is allowed for npm_script validation. Received: ${command.command}`,
        severity: 'error',
      });
    }

    const expectedArgs = ['run', command.scriptName];

    if (
      command.args.length !== 2 ||
      command.args[0] !== expectedArgs[0] ||
      command.args[1] !== expectedArgs[1]
    ) {
      issues.push({
        code: 'VALIDATION_ARGS_NOT_ALLOWED',
        message: `Only "npm run <allowed-script>" is allowed. Received: ${command.args.join(' ')}`,
        severity: 'error',
      });
    }

    if (!allowedScripts.has(command.scriptName)) {
      issues.push({
        code: 'VALIDATION_SCRIPT_NOT_ALLOWED',
        message: `Script is not allowed for validation: ${command.scriptName}`,
        severity: 'error',
      });
    }
  }

  private validateNodeBinaryCommand(
    projectRoot: string,
    command: RealProjectTrialValidationCommand,
    issues: RealProjectTrialSafetyIssue[],
  ): void {
    if (command.command !== 'node') {
      issues.push({
        code: 'VALIDATION_NODE_COMMAND_NOT_ALLOWED',
        message: `Only node is allowed for node_binary validation. Received: ${command.command}`,
        severity: 'error',
      });
    }

    const binaryPath = command.args[0];

    if (!binaryPath) {
      issues.push({
        code: 'VALIDATION_NODE_BINARY_MISSING',
        message: 'Node binary validation requires a binary path.',
        severity: 'error',
      });
      return;
    }

    const absoluteProjectRoot = resolve(projectRoot);
    const absoluteBinaryPath = resolve(binaryPath);
    const pathFromRoot = relative(absoluteProjectRoot, absoluteBinaryPath);

    if (pathFromRoot.startsWith('..') || pathFromRoot === '..') {
      issues.push({
        code: 'VALIDATION_NODE_BINARY_ESCAPES_PROJECT_ROOT',
        message: `Node binary escapes project root: ${binaryPath}`,
        severity: 'error',
      });
    }

    const normalizedBinaryPath = normalize(pathFromRoot).replaceAll('\\', '/');

    if (normalizedBinaryPath !== 'node_modules/typescript/bin/tsc') {
      issues.push({
        code: 'VALIDATION_NODE_BINARY_NOT_ALLOWED',
        message: `Only local TypeScript compiler is allowed. Received: ${normalizedBinaryPath}`,
        severity: 'error',
      });
    }

    const allowedArgs = ['--noEmit', '--pretty', 'false'];
    const receivedArgs = command.args.slice(1);

    if (receivedArgs.join('|') !== allowedArgs.join('|')) {
      issues.push({
        code: 'VALIDATION_NODE_BINARY_ARGS_NOT_ALLOWED',
        message: `Only "${allowedArgs.join(' ')}" is allowed for direct TypeScript validation.`,
        severity: 'error',
      });
    }
  }

  private resolveCommand(command: RealProjectTrialValidationCommand): ResolvedCommand {
    if (command.kind === 'npm_script' && platform() === 'win32') {
      return {
        executable: process.env['ComSpec'] ?? 'C:\\Windows\\System32\\cmd.exe',
        args: ['/d', '/s', '/c', 'npm', 'run', command.scriptName],
      };
    }

    return {
      executable: command.command,
      args: [...command.args],
    };
  }

  private createSafeEnvironment(): NodeJS.ProcessEnv {
    const safeEnvironment: NodeJS.ProcessEnv = {};
    const allowedKeys = [
      'PATH',
      'Path',
      'PATHEXT',
      'SystemRoot',
      'WINDIR',
      'ComSpec',
      'TEMP',
      'TMP',
      'HOME',
      'USERPROFILE',
      'APPDATA',
      'LOCALAPPDATA',
    ];

    for (const key of allowedKeys) {
      const value = process.env[key];

      if (typeof value !== 'undefined') {
        safeEnvironment[key] = value;
      }
    }

    return safeEnvironment;
  }

  private sanitizeOutput(value: string): string {
    const redacted = this.redactor.redact(value);

    return typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
  }

  private toText(value: string | Buffer | undefined): string {
    if (typeof value === 'undefined') {
      return '';
    }

    if (Buffer.isBuffer(value)) {
      return value.toString('utf8');
    }

    return value;
  }
}
