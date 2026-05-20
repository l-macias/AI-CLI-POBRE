import { CliSuggestionBuilder } from './CliSuggestionBuilder.js';
import type { CliParseIssue } from './CliTypes.js';

export interface CliPresentedError {
  readonly message: string;
  readonly suggestions: string[];
}

export class CliErrorPresenter {
  private readonly suggestionBuilder: CliSuggestionBuilder;

  public constructor(suggestionBuilder: CliSuggestionBuilder = new CliSuggestionBuilder()) {
    this.suggestionBuilder = suggestionBuilder;
  }

  public present(error: unknown): string {
    return this.presentDetailed(error).message;
  }

  public presentDetailed(error: unknown): CliPresentedError {
    const message = error instanceof Error ? error.message : String(error);
    const issue: CliParseIssue = {
      code: 'CLI_COMMAND_FAILED',
      message,
    };

    return {
      message,
      suggestions: this.suggestionBuilder.build(issue),
    };
  }
}
