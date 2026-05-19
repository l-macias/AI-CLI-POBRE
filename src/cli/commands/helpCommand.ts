import type { CliHelpRenderer } from '../CliHelpRenderer.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliHelpCommand } from '../CliTypes.js';

export class HelpCommand implements CliCommandHandler<CliHelpCommand> {
  public readonly name = 'help';

  private readonly helpRenderer: CliHelpRenderer;

  public constructor(helpRenderer: CliHelpRenderer) {
    this.helpRenderer = helpRenderer;
  }

  public execute(): Promise<unknown> {
    return Promise.resolve(this.helpRenderer.render());
  }
}
