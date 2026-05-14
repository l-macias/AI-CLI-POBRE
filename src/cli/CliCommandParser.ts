import type { CliCommand, CliOutputFormat, CliParseIssue, CliParseResult } from './CliTypes.js';

type FlagValue = string | boolean;

const knownCommands = new Set(['help', 'context', 'validate', 'validation-feedback', 'code-intel']);

export class CliCommandParser {
  public parse(argv: string[]): CliParseResult {
    const [rawCommandName, ...rest] = argv;
    const commandName = rawCommandName ?? 'help';

    if (!knownCommands.has(commandName)) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_UNKNOWN_COMMAND',
            message: `Unknown command "${commandName}". Run "help" for available commands.`,
          },
        ],
      };
    }

    const flags = this.parseFlags(rest);
    const format = this.resolveFormat(flags);

    if (format instanceof Error) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLI_INVALID_FORMAT',
            message: format.message,
          },
        ],
      };
    }

    return this.buildCommand(commandName, flags, format);
  }

  private buildCommand(
    commandName: string,
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliParseResult {
    if (commandName === 'help') {
      return {
        ok: true,
        command: {
          name: 'help',
          format,
        },
      };
    }

    if (commandName === 'context') {
      const maxTokens = this.getOptionalNumberFlag(flags, 'max-tokens');
      const issues = this.validateOptionalNumber('max-tokens', maxTokens);

      if (issues.length > 0) {
        return {
          ok: false,
          issues,
        };
      }

      const command: CliCommand = {
        name: 'context',
        format,
      };

      if (maxTokens !== undefined) {
        command.maxTokens = maxTokens;
      }

      return {
        ok: true,
        command,
      };
    }

    if (commandName === 'validate') {
      return {
        ok: true,
        command: {
          name: 'validate',
          format,
        },
      };
    }

    if (commandName === 'validation-feedback') {
      return {
        ok: true,
        command: {
          name: 'validation-feedback',
          format,
        },
      };
    }

    return this.buildCodeIntelCommand(flags, format);
  }

  private buildCodeIntelCommand(
    flags: Map<string, FlagValue>,
    format: CliOutputFormat,
  ): CliParseResult {
    const file = this.getOptionalStringFlag(flags, 'file');
    const query = this.getOptionalStringFlag(flags, 'query');
    const maxChunks = this.getOptionalNumberFlag(flags, 'max-chunks');
    const issues = this.validateOptionalNumber('max-chunks', maxChunks);

    if (issues.length > 0) {
      return {
        ok: false,
        issues,
      };
    }

    const command: CliCommand = {
      name: 'code-intel',
      format,
    };

    if (file !== undefined) {
      command.targetFilePath = file;
    }

    if (query !== undefined) {
      command.query = query;
    }

    if (maxChunks !== undefined) {
      command.maxChunks = maxChunks;
    }

    return {
      ok: true,
      command,
    };
  }

  private parseFlags(args: string[]): Map<string, FlagValue> {
    const flags = new Map<string, FlagValue>();

    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];

      if (arg === undefined || !arg.startsWith('--')) {
        continue;
      }

      const key = arg.slice(2);
      const next = args[index + 1];

      if (next === undefined || next.startsWith('--')) {
        flags.set(key, true);
        continue;
      }

      flags.set(key, next);
      index += 1;
    }

    return flags;
  }

  private resolveFormat(flags: Map<string, FlagValue>): CliOutputFormat | Error {
    const value = this.getOptionalStringFlag(flags, 'format');

    if (value === undefined) {
      return 'text';
    }

    if (value === 'text' || value === 'json') {
      return value;
    }

    return new Error(`Invalid format "${value}". Allowed: text, json.`);
  }

  private getOptionalStringFlag(flags: Map<string, FlagValue>, name: string): string | undefined {
    const value = flags.get(name);

    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  private getOptionalNumberFlag(flags: Map<string, FlagValue>, name: string): number | undefined {
    const value = this.getOptionalStringFlag(flags, name);

    if (value === undefined) {
      return undefined;
    }

    return Number(value);
  }

  private validateOptionalNumber(name: string, value: number | undefined): CliParseIssue[] {
    if (value === undefined) {
      return [];
    }

    if (!Number.isInteger(value) || value <= 0) {
      return [
        {
          code: 'CLI_INVALID_NUMBER_FLAG',
          message: `Flag "--${name}" must be a positive integer.`,
        },
      ];
    }

    return [];
  }
}
