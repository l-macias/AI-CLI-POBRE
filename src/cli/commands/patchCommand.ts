import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliPatchCommand } from '../CliTypes.js';

export class PatchCommand implements CliCommandHandler<CliPatchCommand> {
  public readonly name = 'patch';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliPatchCommand): Promise<unknown> {
    return this.bridge.patch(command);
  }
}
