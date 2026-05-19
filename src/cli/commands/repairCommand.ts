import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliRepairCommand } from '../CliTypes.js';

export class RepairCommand implements CliCommandHandler<CliRepairCommand> {
  public readonly name = 'repair';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliRepairCommand): Promise<unknown> {
    return this.bridge.repair(command);
  }
}
