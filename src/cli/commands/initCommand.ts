import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliInitCommand } from '../CliTypes.js';

export class InitCommand implements CliCommandHandler<CliInitCommand> {
  public readonly name = 'init';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliInitCommand): Promise<unknown> {
    return this.bridge.init(command);
  }
}
