import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliSecurityCommand } from '../CliTypes.js';

interface SecurityRuntimeBridge {
  security(command: CliSecurityCommand): Promise<unknown>;
}

export class SecurityCommand implements CliCommandHandler<CliSecurityCommand> {
  public readonly name = 'security';

  private readonly bridge: SecurityRuntimeBridge;

  public constructor(bridge: SecurityRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliSecurityCommand): Promise<unknown> {
    return this.bridge.security(command);
  }
}
