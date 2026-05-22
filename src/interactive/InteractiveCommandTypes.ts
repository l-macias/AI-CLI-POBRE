import type { InteractiveSessionState } from './InteractiveSessionTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

export type InteractiveCommandName =
  | 'plan'
  | 'context'
  | 'files'
  | 'diff'
  | 'risks'
  | 'apply'
  | 'reject'
  | 'revise'
  | 'verify'
  | 'report'
  | 'pause'
  | 'resume'
  | 'help';

export type InteractiveCommandKind = 'slash_command' | 'natural_language';

export type InteractiveCommandIntent =
  | 'show_plan'
  | 'show_context'
  | 'show_files'
  | 'show_diff'
  | 'show_risks'
  | 'request_apply'
  | 'request_reject'
  | 'request_revision'
  | 'request_verify'
  | 'show_report'
  | 'pause_session'
  | 'resume_session'
  | 'show_help'
  | 'user_instruction';

export interface InteractiveCommand {
  id: string;
  kind: InteractiveCommandKind;
  intent: InteractiveCommandIntent;
  rawInput: string;
  createdAt: string;
  commandName?: InteractiveCommandName | undefined;
  argument?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface InteractiveCommandParseIssue {
  code: string;
  message: string;
}

export type InteractiveCommandParseResult =
  | {
      ok: true;
      command: InteractiveCommand;
    }
  | {
      ok: false;
      issues: InteractiveCommandParseIssue[];
    };

export interface InteractiveCommandHandlerResult {
  session: InteractiveSessionState;
  status: 'handled' | 'blocked';
  message: string;
  issues: InteractiveCommandParseIssue[];
}

export interface InteractiveCommandRouteResult {
  session: InteractiveSessionState;
  command: InteractiveCommand;
  status: 'handled' | 'blocked';
  message: string;
  issues: InteractiveCommandParseIssue[];
}
