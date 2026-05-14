export type CliCommandName = 'help' | 'context' | 'validate' | 'validation-feedback' | 'code-intel';

export type CliOutputFormat = 'text' | 'json';

export interface CliBaseCommand {
  name: CliCommandName;
  format: CliOutputFormat;
}

export interface CliHelpCommand extends CliBaseCommand {
  name: 'help';
}

export interface CliContextCommand extends CliBaseCommand {
  name: 'context';
  maxTokens?: number | undefined;
}

export interface CliValidateCommand extends CliBaseCommand {
  name: 'validate';
}

export interface CliValidationFeedbackCommand extends CliBaseCommand {
  name: 'validation-feedback';
}

export interface CliCodeIntelCommand extends CliBaseCommand {
  name: 'code-intel';
  targetFilePath?: string | undefined;
  query?: string | undefined;
  maxChunks?: number | undefined;
}

export type CliCommand =
  | CliHelpCommand
  | CliContextCommand
  | CliValidateCommand
  | CliValidationFeedbackCommand
  | CliCodeIntelCommand;

export interface CliParseIssue {
  code: string;
  message: string;
}

export type CliParseResult =
  | {
      ok: true;
      command: CliCommand;
    }
  | {
      ok: false;
      issues: CliParseIssue[];
    };

export interface CliRunResult {
  command: CliCommandName;
  status: 'ok' | 'error';
  output: unknown;
  issues: CliParseIssue[];
  createdAt: string;
}
