import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliQuickstartCommand } from '../CliTypes.js';

interface QuickstartRuntimeBridge {
  quickstart(command: CliQuickstartCommand): Promise<unknown>;
}

export class QuickstartCommand implements CliCommandHandler<CliQuickstartCommand> {
  public readonly name = 'quickstart';

  private readonly bridge: QuickstartRuntimeBridge;

  public constructor(bridge: QuickstartRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliQuickstartCommand): Promise<unknown> {
    return this.bridge.quickstart(command);
  }
}
