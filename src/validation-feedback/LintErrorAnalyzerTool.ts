import type {
  ParsedValidationIssue,
  ValidationErrorLocation,
  ValidationFeedbackCategory,
} from '../types/ValidationFeedbackTypes.js';
import type { ValidationIssue } from '../types/ValidationTypes.js';

const eslintCompactPattern =
  /^(.+?):(\d+):(\d+):\s+(error|warning)\s+(.+?)\s+(@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+|[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?)$/;

const eslintMessageRulePattern = /(?:rule|Rule)\s+['"]?([^'"\s]+)['"]?/;
const quotedSymbolPattern = /['"]([A-Za-z_$][A-Za-z0-9_$]*)['"]/;

export class LintErrorAnalyzerTool {
  public analyze(issue: ValidationIssue): ParsedValidationIssue {
    const parsed = this.parseMessage(issue.message);
    const category = this.resolveCategory(issue);
    const symbol = this.extractSymbol(parsed.message);

    const parsedIssue: ParsedValidationIssue = {
      validationKind: 'lint',
      category,
      code: issue.code,
      message: parsed.message,
      severity: issue.severity,
      location: parsed.location,
      rawIssue: issue,
    };

    if (issue.source !== undefined) {
      parsedIssue.source = issue.source;
    }

    if (parsed.ruleId !== undefined) {
      parsedIssue.ruleId = parsed.ruleId;
    }

    if (symbol !== undefined) {
      parsedIssue.symbol = symbol;
    }

    return parsedIssue;
  }

  private parseMessage(issueMessage: string): {
    message: string;
    location: ValidationErrorLocation;
    ruleId?: string | undefined;
  } {
    const compactMatch = eslintCompactPattern.exec(issueMessage);

    if (compactMatch) {
      const filePath = compactMatch[1];
      const line = Number(compactMatch[2]);
      const column = Number(compactMatch[3]);
      const message = compactMatch[5];
      const ruleId = compactMatch[6];

      return {
        message: message ?? issueMessage,
        location: {
          filePath,
          line: Number.isFinite(line) ? line : undefined,
          column: Number.isFinite(column) ? column : undefined,
        },
        ruleId,
      };
    }

    const ruleMatch = eslintMessageRulePattern.exec(issueMessage);

    return {
      message: issueMessage,
      location: {},
      ruleId: ruleMatch?.[1],
    };
  }

  private resolveCategory(issue: ValidationIssue): ValidationFeedbackCategory {
    if (issue.code === 'VALIDATION_COMMAND_NOT_EXECUTED') {
      return 'validation_skipped';
    }

    return 'lint_rule_violation';
  }

  private extractSymbol(message: string): string | undefined {
    const match = quotedSymbolPattern.exec(message);
    const symbol = match?.[1];

    if (symbol === undefined || symbol.trim().length === 0) {
      return undefined;
    }

    return symbol.trim();
  }
}
