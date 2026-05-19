import { CliApp } from './CliApp.js';
import type { CliCommandParser } from './CliCommandParser.js';
import { CliHelpRenderer } from './CliHelpRenderer.js';
import { CliOutputFormatter } from './CliOutputFormatter.js';
import { CliRouter } from './CliRouter.js';
import type { CliRuntimeBridge } from './CliRuntimeBridge.js';
import { createCliCommandRegistry } from './createCliCommandRegistry.js';
import type { CliRunResult } from './CliTypes.js';

export interface CliRunnerOptions {
  parser?: CliCommandParser | undefined;
  helpRenderer?: CliHelpRenderer | undefined;
  formatter?: CliOutputFormatter | undefined;
  bridge?: CliRuntimeBridge | undefined;
}

export class CliRunner {
  private readonly app: CliApp;
  private readonly formatter: CliOutputFormatter;

  public constructor(options: CliRunnerOptions = {}) {
    const helpRenderer = options.helpRenderer ?? new CliHelpRenderer();
    const registry = createCliCommandRegistry({
      bridge: options.bridge,
      helpRenderer,
    });

    this.app = new CliApp({
      parser: options.parser,
      helpRenderer,
      router: new CliRouter({
        registry,
      }),
    });

    this.formatter = options.formatter ?? new CliOutputFormatter();
  }

  public run(argv: string[]): Promise<CliRunResult> {
    return this.app.run(argv);
  }

  public format(result: CliRunResult, format: 'text' | 'json'): string {
    return this.formatter.format(result, format);
  }
}
