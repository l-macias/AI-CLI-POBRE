import { CliCommandParser } from './CliCommandParser.js';
import { CliErrorPresenter } from './CliErrorPresenter.js';
import { CliHelpRenderer } from './CliHelpRenderer.js';
import type { CliRouter } from './CliRouter.js';
import type { CliRunResult } from './CliTypes.js';

export interface CliAppOptions {
  parser?: CliCommandParser | undefined;
  helpRenderer?: CliHelpRenderer | undefined;
  router: CliRouter;
  errorPresenter?: CliErrorPresenter | undefined;
}

export class CliApp {
  private readonly parser: CliCommandParser;
  private readonly helpRenderer: CliHelpRenderer;
  private readonly router: CliRouter;
  private readonly errorPresenter: CliErrorPresenter;

  public constructor(options: CliAppOptions) {
    this.parser = options.parser ?? new CliCommandParser();
    this.helpRenderer = options.helpRenderer ?? new CliHelpRenderer();
    this.router = options.router;
    this.errorPresenter = options.errorPresenter ?? new CliErrorPresenter();
  }

  public async run(argv: string[]): Promise<CliRunResult> {
    const parsed = this.parser.parse(argv);

    if (!parsed.ok) {
      return {
        command: 'help',
        status: 'error',
        output: this.helpRenderer.render(),
        issues: parsed.issues,
        createdAt: new Date().toISOString(),
      };
    }

    try {
      const output = await this.router.route(parsed.command);

      return {
        command: parsed.command.name,
        status: 'ok',
        output,
        issues: [],
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = this.errorPresenter.present(error);

      return {
        command: parsed.command.name,
        status: 'error',
        output: {
          message,
        },
        issues: [
          {
            code: 'CLI_COMMAND_FAILED',
            message,
          },
        ],
        createdAt: new Date().toISOString(),
      };
    }
  }
}
