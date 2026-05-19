import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface GitReadOnlyClientOptions {
  cwd?: string | undefined;
  timeoutMs?: number | undefined;
  maxBufferBytes?: number | undefined;
}

export interface GitReadOnlyCommandResult {
  stdout: string;
  stderr: string;
}

const allowedCommands = new Set(['status', 'diff', 'rev-parse']);

export class GitReadOnlyClient {
  private readonly cwd: string;
  private readonly timeoutMs: number;
  private readonly maxBufferBytes: number;

  public constructor(options: GitReadOnlyClientOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.maxBufferBytes = options.maxBufferBytes ?? 1_000_000;
  }

  public async run(args: string[]): Promise<GitReadOnlyCommandResult> {
    const command = args[0];

    if (command === undefined || !allowedCommands.has(command)) {
      throw new Error(`Read-only git command is not allowed: ${args.join(' ')}`);
    }

    await this.ensureWorkingDirectory();

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
  }

  public getCwd(): string {
    return this.cwd;
  }

  private async ensureWorkingDirectory(): Promise<void> {
    const result = await stat(this.cwd);

    if (!result.isDirectory()) {
      throw new Error(`Git cwd is not a directory: ${this.cwd}`);
    }
  }
}
