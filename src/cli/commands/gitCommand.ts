import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliGitCommand } from '../CliTypes.js';

export class GitCommand implements CliCommandHandler<CliGitCommand> {
  public readonly name = 'git';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliGitCommand): Promise<unknown> {
    return this.bridge.git(command);
  }
}
