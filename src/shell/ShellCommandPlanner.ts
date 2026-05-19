import type { SandboxCommandRequest } from '../types/SandboxTypes.js';

export class ShellCommandPlanner {
  public npmScript(input: {
    script: 'typecheck' | 'lint' | 'build' | 'test';
    cwd?: string | undefined;
    timeoutMs?: number | undefined;
    maxOutputBytes?: number | undefined;
  }): SandboxCommandRequest {
    if (input.script === 'test') {
      return {
        command: 'npm',
        args: ['test'],
        cwd: input.cwd ?? '.',
        timeoutMs: input.timeoutMs,
        maxOutputBytes: input.maxOutputBytes,
        networkAccess: false,
      };
    }

    return {
      command: 'npm',
      args: ['run', input.script],
      cwd: input.cwd ?? '.',
      timeoutMs: input.timeoutMs,
      maxOutputBytes: input.maxOutputBytes,
      networkAccess: false,
    };
  }
}
