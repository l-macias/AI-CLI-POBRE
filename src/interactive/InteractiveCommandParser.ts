import type {
  InteractiveCommand,
  InteractiveCommandIntent,
  InteractiveCommandName,
  InteractiveCommandParseResult,
} from './InteractiveCommandTypes.js';

const knownSlashCommands = new Set<InteractiveCommandName>([
  'plan',
  'context',
  'files',
  'diff',
  'risks',
  'apply',
  'reject',
  'revise',
  'verify',
  'report',
  'pause',
  'resume',
  'help',
]);

const commandIntentMap: Record<InteractiveCommandName, InteractiveCommandIntent> = {
  plan: 'show_plan',
  context: 'show_context',
  files: 'show_files',
  diff: 'show_diff',
  risks: 'show_risks',
  apply: 'request_apply',
  reject: 'request_reject',
  revise: 'request_revision',
  verify: 'request_verify',
  report: 'show_report',
  pause: 'pause_session',
  resume: 'resume_session',
  help: 'show_help',
};

export class InteractiveCommandParser {
  public parse(rawInput: string): InteractiveCommandParseResult {
    const normalized = rawInput.trim();

    if (normalized.length === 0) {
      return {
        ok: false,
        issues: [
          {
            code: 'INTERACTIVE_COMMAND_EMPTY',
            message: 'Interactive command input cannot be empty.',
          },
        ],
      };
    }

    if (normalized.startsWith('/')) {
      return this.parseSlashCommand(normalized);
    }

    return {
      ok: true,
      command: {
        id: this.createId('interactive-command'),
        kind: 'natural_language',
        intent: 'user_instruction',
        rawInput: normalized,
        createdAt: new Date().toISOString(),
      },
    };
  }

  private parseSlashCommand(input: string): InteractiveCommandParseResult {
    const withoutSlash = input.slice(1).trim();
    const [rawName, ...argumentParts] = withoutSlash.split(/\s+/);
    const commandName = rawName?.trim();

    if (!commandName) {
      return {
        ok: false,
        issues: [
          {
            code: 'INTERACTIVE_COMMAND_NAME_MISSING',
            message: 'Slash command name is required.',
          },
        ],
      };
    }

    if (!knownSlashCommands.has(commandName as InteractiveCommandName)) {
      return {
        ok: false,
        issues: [
          {
            code: 'INTERACTIVE_COMMAND_UNKNOWN',
            message: `Unknown interactive command "/${commandName}". Run "/help".`,
          },
        ],
      };
    }

    const typedName = commandName as InteractiveCommandName;
    const argument = argumentParts.join(' ').trim();

    const command: InteractiveCommand = {
      id: this.createId('interactive-command'),
      kind: 'slash_command',
      intent: commandIntentMap[typedName],
      rawInput: input,
      commandName: typedName,
      createdAt: new Date().toISOString(),
      ...(argument.length > 0 ? { argument } : {}),
    };

    return {
      ok: true,
      command,
    };
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
