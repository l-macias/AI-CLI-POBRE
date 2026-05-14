import type { FixCandidate, ParsedValidationIssue } from '../types/ValidationFeedbackTypes.js';

export class FixCandidateGenerator {
  public generate(parsedIssues: ParsedValidationIssue[]): FixCandidate[] {
    return parsedIssues
      .filter((issue) => issue.severity === 'error')
      .map((issue) => this.generateForIssue(issue));
  }

  private generateForIssue(issue: ParsedValidationIssue): FixCandidate {
    if (issue.category === 'typescript_import_error') {
      return {
        title: 'Resolve missing or invalid import',
        description:
          'Inspect the target file import graph and verify the imported module path or exported symbol.',
        targetFilePath: issue.location.filePath,
        symbol: issue.symbol,
        confidence: 'high',
        requiresCodeIntelligence: true,
      };
    }

    if (issue.category === 'typescript_type_error') {
      return {
        title: 'Fix TypeScript type mismatch',
        description:
          'Inspect the affected symbol, its imports, and related type definitions before preparing a structured edit.',
        targetFilePath: issue.location.filePath,
        symbol: issue.symbol,
        confidence: issue.symbol ? 'medium' : 'low',
        requiresCodeIntelligence: true,
      };
    }

    if (issue.category === 'lint_rule_violation') {
      return {
        title: 'Fix lint rule violation',
        description:
          'Inspect the affected file and apply the smallest style or correctness change required by the lint rule.',
        targetFilePath: issue.location.filePath,
        symbol: issue.symbol,
        confidence: issue.ruleId ? 'medium' : 'low',
        requiresCodeIntelligence: false,
      };
    }

    if (issue.category === 'typescript_config_error') {
      return {
        title: 'Review TypeScript configuration',
        description:
          'Block automatic fixing and inspect tsconfig or project configuration manually.',
        targetFilePath: issue.location.filePath,
        symbol: issue.symbol,
        confidence: 'low',
        requiresCodeIntelligence: false,
      };
    }

    return {
      title: 'Inspect validation failure',
      description: 'Validation failed, but the runtime could not classify a precise fix candidate.',
      targetFilePath: issue.location.filePath,
      symbol: issue.symbol,
      confidence: 'low',
      requiresCodeIntelligence: true,
    };
  }
}
