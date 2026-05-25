import { VerifyRunner, type VerifyRunResult } from '../verify/VerifyRunner.js';
import type { PatchSandboxVerifyCommand, SandboxWorkspace } from './SandboxResult.js';

export interface SandboxVerifyRunnerOptions {
  verifyRunner?: VerifyRunner | undefined;
}

export class SandboxVerifyRunner {
  private readonly verifyRunner: VerifyRunner;

  public constructor(options: SandboxVerifyRunnerOptions = {}) {
    this.verifyRunner = options.verifyRunner ?? new VerifyRunner();
  }

  public async run(input: {
    workspace: SandboxWorkspace;
    commands: PatchSandboxVerifyCommand[];
    approvalState: 'approved';
  }): Promise<VerifyRunResult[]> {
    const results: VerifyRunResult[] = [];

    for (const command of input.commands) {
      results.push(
        await this.verifyRunner.run({
          command: command.command,
          args: command.args,
          cwd: input.workspace.workspaceRoot,
          approvalState: input.approvalState,
        }),
      );
    }

    return results;
  }
}
