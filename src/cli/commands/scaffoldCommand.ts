import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliScaffoldCommand } from '../CliTypes.js';

interface ScaffoldRuntimeBridge {
  scaffold(command: CliScaffoldCommand): Promise<unknown>;
}

export class ScaffoldCommand implements CliCommandHandler<CliScaffoldCommand> {
  public readonly name = 'scaffold';

  private readonly bridge: ScaffoldRuntimeBridge;

  public constructor(bridge: ScaffoldRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliScaffoldCommand): Promise<unknown> {
    return this.bridge.scaffold(command);
  }
}
