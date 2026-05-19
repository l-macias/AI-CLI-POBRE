import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliStatusCommand } from '../CliTypes.js';

export class StatusCommand implements CliCommandHandler<CliStatusCommand> {
  public readonly name = 'status';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliStatusCommand): Promise<unknown> {
    return this.bridge.status(command);
  }
}
