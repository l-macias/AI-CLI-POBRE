import type { CliCommandRegistry } from './CliCommandRegistry.js';
import type { CliCommand } from './CliTypes.js';

export interface CliRouterOptions {
  registry: CliCommandRegistry;
}

export class CliRouter {
  private readonly registry: CliCommandRegistry;

  public constructor(options: CliRouterOptions) {
    this.registry = options.registry;
  }

  public async route(command: CliCommand): Promise<unknown> {
    const handler = this.registry.get(command.name);

    if (!handler) {
      throw new Error(`CLI command handler not found: ${command.name}`);
    }

    return handler.execute(command);
  }
}
