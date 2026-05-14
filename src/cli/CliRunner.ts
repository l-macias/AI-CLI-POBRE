import { CliCommandParser } from './CliCommandParser.js';
import { CliHelpRenderer } from './CliHelpRenderer.js';
import { CliOutputFormatter } from './CliOutputFormatter.js';
import { CliRuntimeBridge } from './CliRuntimeBridge.js';
import type { CliCommand, CliRunResult } from './CliTypes.js';

export interface CliRunnerOptions {
  parser?: CliCommandParser | undefined;
  helpRenderer?: CliHelpRenderer | undefined;
  formatter?: CliOutputFormatter | undefined;
  bridge?: CliRuntimeBridge | undefined;
}

export class CliRunner {
  private readonly parser: CliCommandParser;
  private readonly helpRenderer: CliHelpRenderer;
  private readonly formatter: CliOutputFormatter;
  private readonly bridge: CliRuntimeBridge;

  public constructor(options: CliRunnerOptions = {}) {
    this.parser = options.parser ?? new CliCommandParser();
    this.helpRenderer = options.helpRenderer ?? new CliHelpRenderer();
    this.formatter = options.formatter ?? new CliOutputFormatter();
    this.bridge = options.bridge ?? new CliRuntimeBridge();
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
      const output = await this.execute(parsed.command);

      return {
        command: parsed.command.name,
        status: 'ok',
        output,
        issues: [],
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        command: parsed.command.name,
        status: 'error',
        output: {
          message: error instanceof Error ? error.message : String(error),
        },
        issues: [
          {
            code: 'CLI_COMMAND_FAILED',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        createdAt: new Date().toISOString(),
      };
    }
  }

  public format(result: CliRunResult, format: 'text' | 'json'): string {
    return this.formatter.format(result, format);
  }

  private async execute(command: CliCommand): Promise<unknown> {
    if (command.name === 'help') {
      return this.helpRenderer.render();
    }

    if (command.name === 'context') {
      return this.bridge.loadContext(command);
    }

    if (command.name === 'validate') {
      return this.bridge.validate();
    }

    if (command.name === 'validation-feedback') {
      return this.bridge.validationFeedback();
    }

    return this.bridge.codeIntel(command);
  }
}
