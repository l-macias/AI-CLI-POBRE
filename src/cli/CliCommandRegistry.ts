import type { CliCommandHandler } from './CliCommandHandler.js';
import type { CliCommand, CliCommandName } from './CliTypes.js';

export class CliCommandRegistry {
  private readonly handlers = new Map<CliCommandName, CliCommandHandler<CliCommand>>();

  public register<TCommand extends CliCommand>(handler: CliCommandHandler<TCommand>): void {
    this.handlers.set(handler.name, handler);
  }

  public get(commandName: CliCommandName): CliCommandHandler<CliCommand> | undefined {
    return this.handlers.get(commandName);
  }

  public list(): CliCommandName[] {
    return [...this.handlers.keys()];
  }
}
