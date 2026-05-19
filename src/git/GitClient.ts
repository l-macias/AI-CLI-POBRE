import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';

import { promisify } from 'node:util';
import { ZeroRuntimeError } from '../utils/errors.js';

const execFileAsync = promisify(execFile);

export interface GitClientOptions {
  cwd?: string | undefined;
  timeoutMs?: number | undefined;
  maxBufferBytes?: number | undefined;
}

export interface GitCommandResult {
  stdout: string;
  stderr: string;
}

const allowedCommands = new Set([
  'status',
  'diff',
  'rev-parse',
  'branch',
  'add',
  'commit',
  'restore',
]);

export class GitClient {
  private readonly cwd: string;
  private readonly timeoutMs: number;
  private readonly maxBufferBytes: number;

  public constructor(options: GitClientOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.maxBufferBytes = options.maxBufferBytes ?? 1_000_000;
  }

  public async run(args: string[]): Promise<GitCommandResult> {
    const command = args[0];

    if (command === undefined || !allowedCommands.has(command)) {
      throw new ZeroRuntimeError('Git command is not allowed by GitClient.', {
        code: 'GIT_COMMAND_NOT_ALLOWED',
        cause: {
          args,
        },
      });
    }

    await this.ensureWorkingDirectory();

    try {
      const result = await execFileAsync('git', args, {
        cwd: this.cwd,
        timeout: this.timeoutMs,
        maxBuffer: this.maxBufferBytes,
        windowsHide: true,
        shell: false,
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (error) {
      throw new ZeroRuntimeError('Controlled git command failed.', {
        code: 'GIT_COMMAND_FAILED',
        cause: this.serializeError(error, args),
      });
    }
  }

  public getCwd(): string {
    return this.cwd;
  }

  private async ensureWorkingDirectory(): Promise<void> {
    const result = await stat(this.cwd);

    if (!result.isDirectory()) {
      throw new ZeroRuntimeError('Git cwd is not a directory.', {
        code: 'GIT_CWD_NOT_DIRECTORY',
        cause: {
          cwd: this.cwd,
        },
      });
    }
  }

  private serializeError(error: unknown, args: string[]): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        args,
      };
    }

    return {
      message: String(error),
      args,
    };
  }
}
