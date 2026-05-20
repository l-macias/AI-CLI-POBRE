import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliDemoCommand } from '../CliTypes.js';

interface DemoRuntimeBridge {
  demo(command: CliDemoCommand): Promise<unknown>;
}

export class DemoCommand implements CliCommandHandler<CliDemoCommand> {
  public readonly name = 'demo';

  private readonly bridge: DemoRuntimeBridge;

  public constructor(bridge: DemoRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliDemoCommand): Promise<unknown> {
    return this.bridge.demo(command);
  }
}
