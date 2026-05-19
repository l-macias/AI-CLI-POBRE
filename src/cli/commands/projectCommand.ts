import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliProjectCommand } from '../CliTypes.js';

export class ProjectCommand implements CliCommandHandler<CliProjectCommand> {
  public readonly name = 'project';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliProjectCommand): Promise<unknown> {
    return this.bridge.project(command);
  }
}
