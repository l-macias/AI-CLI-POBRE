import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fromRoot } from '../utils/paths.js';
import type { SandboxCommandRequest } from '../types/SandboxTypes.js';
import { CommandOutputLimiter } from './CommandOutputLimiter.js';
import { ShellCommandResolver } from './ShellCommandResolver.js';

const execFileAsync = promisify(execFile);

export interface ShellCommandExecutionResult {
  command: string;
  resolvedCommand: string;
  args: string[];
  resolvedArgs: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface ShellCommandExecutorOptions {
  outputLimiter?: CommandOutputLimiter | undefined;
  commandResolver?: ShellCommandResolver | undefined;
}

const blockedEnvPatterns = [
  /api[_-]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /private/i,
  /credential/i,
  /^OPENROUTER_API_KEY$/i,
];

const requiredWindowsEnvKeys = [
  'PATH',
  'Path',
  'PATHEXT',
  'SystemRoot',
  'WINDIR',
  'ComSpec',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'npm_execpath',
  'npm_node_execpath',
  'npm_config_user_agent',
];

const requiredPosixEnvKeys = [
  'PATH',
  'HOME',
  'TMPDIR',
  'TEMP',
  'TMP',
  'SHELL',
  'npm_execpath',
  'npm_node_execpath',
  'npm_config_user_agent',
];

export class ShellCommandExecutor {
  private readonly outputLimiter: CommandOutputLimiter;
  private readonly commandResolver: ShellCommandResolver;

  public constructor(options: ShellCommandExecutorOptions = {}) {
    this.outputLimiter = options.outputLimiter ?? new CommandOutputLimiter();
    this.commandResolver = options.commandResolver ?? new ShellCommandResolver();
  }

  public async execute(input: {
    request: SandboxCommandRequest;
    timeoutMs: number;
    maxOutputBytes: number;
  }): Promise<ShellCommandExecutionResult> {
    const startedAtDate = new Date();
    const cwd = path.resolve(fromRoot(input.request.cwd));
    const resolved = this.commandResolver.resolve(input.request.command);
    const resolvedArgs = [...resolved.argsPrefix, ...input.request.args];

    try {
      const result = await execFileAsync(resolved.executable, resolvedArgs, {
        cwd,
        timeout: input.timeoutMs,
        maxBuffer: input.maxOutputBytes,
        windowsHide: true,
        shell: false,
        env: this.buildEnv(input.request.env),
      });

      return this.createResult({
        request: input.request,
        resolvedCommand: resolved.displayCommand,
        resolvedArgs,
        startedAtDate,
        exitCode: 0,
        stdout: result.stdout,
        stderr: result.stderr,
        maxOutputBytes: input.maxOutputBytes,
      });
    } catch (error) {
      const serialized = this.serializeExecutionError(error);

      return this.createResult({
        request: input.request,
        resolvedCommand: resolved.displayCommand,
        resolvedArgs,
        startedAtDate,
        exitCode: serialized.exitCode,
        stdout: serialized.stdout,
        stderr: serialized.stderr,
        maxOutputBytes: input.maxOutputBytes,
      });
    }
  }

  private createResult(input: {
    request: SandboxCommandRequest;
    resolvedCommand: string;
    resolvedArgs: string[];
    startedAtDate: Date;
    exitCode: number;
    stdout: string;
    stderr: string;
    maxOutputBytes: number;
  }): ShellCommandExecutionResult {
    const finishedAtDate = new Date();
    const limitedStdout = this.outputLimiter.limit(input.stdout, input.maxOutputBytes);
    const limitedStderr = this.outputLimiter.limit(input.stderr, input.maxOutputBytes);

    return {
      command: input.request.command,
      resolvedCommand: input.resolvedCommand,
      args: [...input.request.args],
      resolvedArgs: [...input.resolvedArgs],
      cwd: input.request.cwd,
      exitCode: input.exitCode,
      stdout: limitedStdout.output,
      stderr: limitedStderr.output,
      stdoutTruncated: limitedStdout.truncated,
      stderrTruncated: limitedStderr.truncated,
      startedAt: input.startedAtDate.toISOString(),
      finishedAt: finishedAtDate.toISOString(),
      durationMs: finishedAtDate.getTime() - input.startedAtDate.getTime(),
    };
  }

  private buildEnv(extraEnv: Record<string, string> | undefined): NodeJS.ProcessEnv {
    const safeEnv: NodeJS.ProcessEnv = {};
    const requiredKeys =
      process.platform === 'win32' ? requiredWindowsEnvKeys : requiredPosixEnvKeys;

    for (const key of requiredKeys) {
      const value = process.env[key];

      if (value !== undefined && !this.isBlockedEnvKey(key)) {
        safeEnv[key] = value;
      }
    }

    for (const [key, value] of Object.entries(extraEnv ?? {})) {
      if (!this.isBlockedEnvKey(key)) {
        safeEnv[key] = value;
      }
    }

    safeEnv['NODE_ENV'] = safeEnv['NODE_ENV'] ?? 'test';

    return safeEnv;
  }

  private isBlockedEnvKey(key: string): boolean {
    return blockedEnvPatterns.some((pattern) => pattern.test(key));
  }

  private serializeExecutionError(error: unknown): {
    exitCode: number;
    stdout: string;
    stderr: string;
  } {
    if (typeof error === 'object' && error !== null) {
      const record = error as {
        code?: unknown;
        stdout?: unknown;
        stderr?: unknown;
        message?: unknown;
      };

      return {
        exitCode: typeof record.code === 'number' ? record.code : 1,
        stdout: typeof record.stdout === 'string' ? record.stdout : '',
        stderr:
          typeof record.stderr === 'string' && record.stderr.length > 0
            ? record.stderr
            : typeof record.message === 'string'
              ? record.message
              : 'Command execution failed.',
      };
    }

    return {
      exitCode: 1,
      stdout: '',
      stderr: String(error),
    };
  }
}
