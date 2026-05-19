import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliInspectCommand } from '../CliTypes.js';

export class InspectCommand implements CliCommandHandler<CliInspectCommand> {
  public readonly name = 'inspect';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliInspectCommand): Promise<unknown> {
    return this.bridge.inspect(command);
  }
}
