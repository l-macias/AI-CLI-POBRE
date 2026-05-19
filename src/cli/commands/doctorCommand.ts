import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliDoctorCommand } from '../CliTypes.js';

export class DoctorCommand implements CliCommandHandler<CliDoctorCommand> {
  public readonly name = 'doctor';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliDoctorCommand): Promise<unknown> {
    return this.bridge.doctor(command);
  }
}
