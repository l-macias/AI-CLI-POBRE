import type { InteractiveSession } from './InteractiveSession.js';
import { InteractiveCommandHandler } from './InteractiveCommandHandler.js';
import { InteractiveCommandParser } from './InteractiveCommandParser.js';
import type { InteractiveCommandRouteResult } from './InteractiveCommandTypes.js';
import type { InteractiveSessionState } from './InteractiveSessionTypes.js';

export interface InteractiveCommandRouterOptions {
  parser?: InteractiveCommandParser | undefined;
  handler?: InteractiveCommandHandler | undefined;
  session?: InteractiveSession | undefined;
}

export class InteractiveCommandRouter {
  private readonly parser: InteractiveCommandParser;
  private readonly handler: InteractiveCommandHandler;

  public constructor(options: InteractiveCommandRouterOptions = {}) {
    this.parser = options.parser ?? new InteractiveCommandParser();

    if (options.handler) {
      this.handler = options.handler;
      return;
    }

    if (!options.session) {
      throw new Error('InteractiveCommandRouter requires either handler or session.');
    }

    this.handler = new InteractiveCommandHandler({
      session: options.session,
    });
  }

  public async route(
    state: InteractiveSessionState,
    rawInput: string,
  ): Promise<InteractiveCommandRouteResult> {
    const parsed = this.parser.parse(rawInput);

    if (!parsed.ok) {
      return {
        session: state,
        command: {
          id: this.createId('interactive-command-invalid'),
          kind: 'natural_language',
          intent: 'user_instruction',
          rawInput,
          createdAt: new Date().toISOString(),
        },
        status: 'blocked',
        message: 'Interactive command could not be parsed.',
        issues: parsed.issues,
      };
    }

    const handled = await this.handler.handle(state, parsed.command);

    return {
      session: handled.session,
      command: parsed.command,
      status: handled.status,
      message: handled.message,
      issues: handled.issues,
    };
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
