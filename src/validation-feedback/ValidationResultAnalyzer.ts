import type {
  ParsedValidationIssue,
  ValidationFailureContext,
  ValidationFeedbackCategory,
} from '../types/ValidationFeedbackTypes.js';
import type {
  ValidationIssue,
  ValidationKind,
  ValidationResult,
  ValidationRun,
} from '../types/ValidationTypes.js';
import { LintErrorAnalyzerTool } from './LintErrorAnalyzerTool.js';
import { TypeErrorAnalyzerTool } from './TypeErrorAnalyzerTool.js';

export interface ValidationResultAnalyzerOptions {
  typeAnalyzer?: TypeErrorAnalyzerTool | undefined;
  lintAnalyzer?: LintErrorAnalyzerTool | undefined;
}

export class ValidationResultAnalyzer {
  private readonly typeAnalyzer: TypeErrorAnalyzerTool;
  private readonly lintAnalyzer: LintErrorAnalyzerTool;

  public constructor(options: ValidationResultAnalyzerOptions = {}) {
    this.typeAnalyzer = options.typeAnalyzer ?? new TypeErrorAnalyzerTool();
    this.lintAnalyzer = options.lintAnalyzer ?? new LintErrorAnalyzerTool();
  }

  public analyzeRun(run: ValidationRun): ValidationFailureContext {
    const parsedIssues = run.results.flatMap((result) => this.analyzeResult(result));

    return {
      runId: run.id,
      status: run.status,
      parsedIssues,
      affectedFiles: this.uniqueDefined(parsedIssues.map((issue) => issue.location.filePath)),
      relatedFilesToRetrieve: this.resolveRelatedFilesToRetrieve(parsedIssues),
      symbols: this.uniqueDefined(parsedIssues.map((issue) => issue.symbol)),
      createdAt: new Date().toISOString(),
    };
  }

  public analyzeResult(result: ValidationResult): ParsedValidationIssue[] {
    return result.issues.map((issue) => this.analyzeIssue(result.target.kind, issue));
  }

  private analyzeIssue(kind: ValidationKind, issue: ValidationIssue): ParsedValidationIssue {
    if (kind === 'typescript') {
      return this.typeAnalyzer.analyze(issue);
    }

    if (kind === 'lint') {
      return this.lintAnalyzer.analyze(issue);
    }

    return this.analyzeBuildIssue(issue);
  }

  private analyzeBuildIssue(issue: ValidationIssue): ParsedValidationIssue {
    const parsedIssue: ParsedValidationIssue = {
      validationKind: 'build',
      category: this.resolveBuildCategory(issue),
      code: issue.code,
      message: issue.message,
      severity: issue.severity,
      location: {},
      rawIssue: issue,
    };

    if (issue.source !== undefined) {
      parsedIssue.source = issue.source;
    }

    return parsedIssue;
  }

  private resolveBuildCategory(issue: ValidationIssue): ValidationFeedbackCategory {
    if (issue.code === 'VALIDATION_COMMAND_NOT_EXECUTED') {
      return 'validation_skipped';
    }

    return 'build_error';
  }

  private resolveRelatedFilesToRetrieve(issues: ParsedValidationIssue[]): string[] {
    const directFiles = this.uniqueDefined(issues.map((issue) => issue.location.filePath));
    const symbols = this.uniqueDefined(issues.map((issue) => issue.symbol));

    return [...directFiles, ...symbols].filter((item, index, array) => {
      return array.indexOf(item) === index;
    });
  }

  private uniqueDefined(values: Array<string | undefined>): string[] {
    return values
      .filter((value): value is string => value !== undefined && value.trim().length > 0)
      .filter((value, index, array) => array.indexOf(value) === index);
  }
}
