import type { InteractiveSession } from './InteractiveSession.js';
import type {
  InteractiveCommand,
  InteractiveCommandHandlerResult,
} from './InteractiveCommandTypes.js';
import type { InteractiveSessionState } from './InteractiveSessionTypes.js';

export interface InteractiveCommandHandlerOptions {
  session: InteractiveSession;
}

export class InteractiveCommandHandler {
  private readonly session: InteractiveSession;

  public constructor(options: InteractiveCommandHandlerOptions) {
    this.session = options.session;
  }

  public async handle(
    state: InteractiveSessionState,
    command: InteractiveCommand,
  ): Promise<InteractiveCommandHandlerResult> {
    if (command.kind === 'natural_language') {
      return this.handleNaturalLanguage(state, command);
    }

    if (command.intent === 'pause_session') {
      const updated = await this.session.pause(state, command.argument ?? 'User requested pause.');

      return {
        session: updated,
        status: 'handled',
        message: 'Session paused.',
        issues: [],
      };
    }

    if (command.intent === 'resume_session') {
      const updated = await this.session.resume(state);

      return {
        session: updated,
        status: 'handled',
        message: 'Session resumed.',
        issues: [],
      };
    }

    if (command.intent === 'request_apply') {
      return this.recordControlledRequest(state, command, {
        title: 'Apply requested',
        description:
          'User requested apply. Runtime must not apply changes here; approval and patch validation are handled by later sessions.',
        status: 'pending',
        message: 'Apply request recorded. No patch was applied.',
      });
    }

    if (command.intent === 'request_reject') {
      return this.recordControlledRequest(state, command, {
        title: 'Reject requested',
        description: 'User rejected the current proposal or pending direction.',
        status: 'completed',
        message: 'Reject request recorded.',
      });
    }

    if (command.intent === 'request_revision') {
      return this.recordControlledRequest(state, command, {
        title: 'Revision requested',
        description: command.argument ?? 'User requested a revision.',
        status: 'pending',
        message: 'Revision request recorded.',
      });
    }

    if (command.intent === 'request_verify') {
      return this.recordControlledRequest(state, command, {
        title: 'Verify requested',
        description:
          'User requested verification. Runtime must route this to safe verify commands in a later session.',
        status: 'pending',
        message: 'Verify request recorded. No command was executed.',
      });
    }

    if (command.intent === 'show_help') {
      const updated = await this.session.addRuntimeAction(state, {
        title: 'Show interactive help',
        description: this.buildHelpText(),
        status: 'completed',
      });

      return {
        session: updated,
        status: 'handled',
        message: this.buildHelpText(),
        issues: [],
      };
    }

    return this.recordReadOnlyViewRequest(state, command);
  }

  private async handleNaturalLanguage(
    state: InteractiveSessionState,
    command: InteractiveCommand,
  ): Promise<InteractiveCommandHandlerResult> {
    const withMessage = await this.session.addMessage(state, {
      role: 'user',
      content: command.rawInput,
    });

    const updated = await this.session.addRuntimeAction(withMessage, {
      title: 'User instruction received',
      description:
        'Natural language instruction was recorded for the interactive session. Runtime has not executed tools or patches.',
      status: 'pending',
      metadata: {
        commandId: command.id,
        intent: command.intent,
      },
    });

    return {
      session: updated,
      status: 'handled',
      message: 'Instruction recorded.',
      issues: [],
    };
  }

  private async recordReadOnlyViewRequest(
    state: InteractiveSessionState,
    command: InteractiveCommand,
  ): Promise<InteractiveCommandHandlerResult> {
    const title = this.titleForIntent(command);
    const description = this.descriptionForReadOnlyIntent(command);

    const updated = await this.session.addRuntimeAction(state, {
      title,
      description,
      status: 'pending',
      metadata: {
        commandId: command.id,
        intent: command.intent,
      },
    });

    return {
      session: updated,
      status: 'handled',
      message: `${title} recorded.`,
      issues: [],
    };
  }

  private async recordControlledRequest(
    state: InteractiveSessionState,
    command: InteractiveCommand,
    input: {
      title: string;
      description: string;
      status: 'pending' | 'completed';
      message: string;
    },
  ): Promise<InteractiveCommandHandlerResult> {
    const updated = await this.session.addRuntimeAction(state, {
      title: input.title,
      description: input.description,
      status: input.status,
      metadata: {
        commandId: command.id,
        intent: command.intent,
        argument: command.argument ?? null,
      },
    });

    return {
      session: updated,
      status: 'handled',
      message: input.message,
      issues: [],
    };
  }

  private titleForIntent(command: InteractiveCommand): string {
    if (command.intent === 'show_plan') {
      return 'Plan view requested';
    }

    if (command.intent === 'show_context') {
      return 'Context view requested';
    }

    if (command.intent === 'show_files') {
      return 'Files view requested';
    }

    if (command.intent === 'show_diff') {
      return 'Diff view requested';
    }

    if (command.intent === 'show_risks') {
      return 'Risk view requested';
    }

    if (command.intent === 'show_report') {
      return 'Report view requested';
    }

    return 'Interactive command requested';
  }

  private descriptionForReadOnlyIntent(command: InteractiveCommand): string {
    return `Interactive command "${command.rawInput}" was recorded as a read-only view request. Rendering will be implemented by later UI/API sessions.`;
  }

  private buildHelpText(): string {
    return `Interactive commands

/plan    Show current plan intent.
/context Show selected context intent.
/files   Show relevant files intent.
/diff    Show diff intent.
/risks   Show risk summary intent.
/apply   Record apply request without applying.
/reject  Record rejection.
/revise  Record revision request.
/verify  Record verification request without executing.
/report  Show session report intent.
/pause   Pause session.
/resume  Resume session.
/help    Show this help.

Natural language instructions are recorded as user messages.`;
  }
}
