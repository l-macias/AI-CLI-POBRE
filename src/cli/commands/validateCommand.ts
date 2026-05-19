import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliValidateCommand } from '../CliTypes.js';

export class ValidateCommand implements CliCommandHandler<CliValidateCommand> {
  public readonly name = 'validate';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliValidateCommand): Promise<unknown> {
    return this.bridge.validate(command);
  }
}
