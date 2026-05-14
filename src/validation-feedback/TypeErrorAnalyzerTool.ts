import type {
  ParsedValidationIssue,
  ValidationErrorLocation,
  ValidationFeedbackCategory,
} from '../types/ValidationFeedbackTypes.js';
import type { ValidationIssue } from '../types/ValidationTypes.js';

const tscLocationPattern = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;
const cannotFindModulePattern = /Cannot find module ['"]([^'"]+)['"]/;
const propertyMissingPattern = /Property ['"]([^'"]+)['"]/;
const nameNotFoundPattern = /Cannot find name ['"]([^'"]+)['"]/;
const typeNotAssignablePattern = /Type ['"]?([^'"]+)['"]? is not assignable/;
const declaredButNeverReadPattern = /['"]([^'"]+)['"] is declared but its value is never read/;

export class TypeErrorAnalyzerTool {
  public analyze(issue: ValidationIssue): ParsedValidationIssue {
    const parsed = this.parseMessage(issue.message);
    const category = this.resolveCategory(issue, parsed.message);
    const symbol = this.extractSymbol(parsed.message);

    const parsedIssue: ParsedValidationIssue = {
      validationKind: 'typescript',
      category,
      code: parsed.code ?? issue.code,
      message: parsed.message,
      severity: issue.severity,
      location: parsed.location,
      rawIssue: issue,
    };

    if (issue.source !== undefined) {
      parsedIssue.source = issue.source;
    }

    if (symbol !== undefined) {
      parsedIssue.symbol = symbol;
    }

    return parsedIssue;
  }

  private parseMessage(issueMessage: string): {
    code?: string | undefined;
    message: string;
    location: ValidationErrorLocation;
  } {
    const locationMatch = tscLocationPattern.exec(issueMessage);

    if (!locationMatch) {
      return {
        message: issueMessage,
        location: {},
      };
    }

    const filePath = locationMatch[1];
    const line = Number(locationMatch[2]);
    const column = Number(locationMatch[3]);
    const code = locationMatch[4];
    const message = locationMatch[5];

    return {
      code,
      message: message ?? issueMessage,
      location: {
        filePath,
        line: Number.isFinite(line) ? line : undefined,
        column: Number.isFinite(column) ? column : undefined,
      },
    };
  }

  private resolveCategory(issue: ValidationIssue, message: string): ValidationFeedbackCategory {
    if (issue.code === 'VALIDATION_COMMAND_NOT_EXECUTED') {
      return 'validation_skipped';
    }

    const haystack = `${issue.code} ${message}`;

    if (cannotFindModulePattern.test(haystack)) {
      return 'typescript_import_error';
    }

    if (haystack.includes('tsconfig') || haystack.includes('compilerOptions')) {
      return 'typescript_config_error';
    }

    return 'typescript_type_error';
  }

  private extractSymbol(message: string): string | undefined {
    const matchers = [
      cannotFindModulePattern,
      propertyMissingPattern,
      nameNotFoundPattern,
      typeNotAssignablePattern,
      declaredButNeverReadPattern,
    ];

    for (const matcher of matchers) {
      const match = matcher.exec(message);
      const symbol = match?.[1];

      if (symbol !== undefined && symbol.trim().length > 0) {
        return symbol.trim();
      }
    }

    return undefined;
  }
}
