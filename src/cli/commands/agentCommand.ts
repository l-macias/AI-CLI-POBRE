import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliAgentCommand } from '../CliTypes.js';

export class AgentCommand implements CliCommandHandler<CliAgentCommand> {
  public readonly name = 'agent';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliAgentCommand): Promise<unknown> {
    return this.bridge.agent(command);
  }
}
