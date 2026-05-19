import type { CliCommand } from './CliTypes.js';

export interface CliCommandHandler<TCommand extends CliCommand = CliCommand> {
  readonly name: TCommand['name'];
  execute(command: TCommand): Promise<unknown>;
}
