import { CliErrorCatalog } from './CliErrorCatalog.js';
import type { CliParseIssue } from './CliTypes.js';

export class CliSuggestionBuilder {
  private readonly catalog: CliErrorCatalog;

  public constructor(catalog: CliErrorCatalog = new CliErrorCatalog()) {
    this.catalog = catalog;
  }

  public build(issue: CliParseIssue): string[] {
    return this.unique([...this.buildFromCatalog(issue), ...this.buildFromMessage(issue.message)]);
  }

  public buildMany(issues: readonly CliParseIssue[]): string[] {
    return this.unique(issues.flatMap((issue) => this.build(issue)));
  }

  private buildFromCatalog(issue: CliParseIssue): string[] {
    const entry = this.catalog.find(issue);

    if (!entry) {
      return [];
    }

    const suggestions = [`${entry.title} ${entry.suggestion}`];

    if (entry.example) {
      suggestions.push(`Try: ${entry.example}`);
    }

    return suggestions;
  }

  private buildFromMessage(message: string): string[] {
    const normalized = message.toLowerCase();
    const suggestions: string[] = [];

    if (normalized.includes('no agent loop state found')) {
      suggestions.push(
        'Start an agent loop first.',
        'Try: zero agent start --project ./target --target src/file.ts --objective "Fix the issue"',
      );
    }

    if (normalized.includes('agent approval not found')) {
      suggestions.push(
        'List current approvals before approving or rejecting.',
        'Try: zero agent approvals --project ./target',
      );
    }

    if (normalized.includes('requires apply_patch and revalidate_project')) {
      suggestions.push(
        'Run the required agent steps before generating the final report.',
        'Try: zero agent step apply_patch --project ./target',
        'Then: zero agent step revalidate_project --project ./target',
      );
    }

    if (normalized.includes('invalid patch proposal json')) {
      suggestions.push(
        'Validate that the proposal file is valid JSON and matches PatchProposalSchema.',
      );
    }

    if (normalized.includes('openrouter') && normalized.includes('allow-real-provider')) {
      suggestions.push(
        'Real provider calls require explicit opt-in.',
        'Try adding: --allow-real-provider',
      );
    }

    return suggestions;
  }

  private unique(values: readonly string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }
}
