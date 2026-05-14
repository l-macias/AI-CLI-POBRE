import type { ValidationFeedbackReport } from '../types/ValidationFeedbackTypes.js';
import type { ValidationRun } from '../types/ValidationTypes.js';
import { FixCandidateGenerator } from './FixCandidateGenerator.js';
import { ValidationFeedbackMapper } from './ValidationFeedbackMapper.js';
import { ValidationResultAnalyzer } from './ValidationResultAnalyzer.js';

export interface ValidationFailureContextBuilderOptions {
  analyzer?: ValidationResultAnalyzer | undefined;
  mapper?: ValidationFeedbackMapper | undefined;
  fixCandidateGenerator?: FixCandidateGenerator | undefined;
}

export class ValidationFailureContextBuilder {
  private readonly analyzer: ValidationResultAnalyzer;
  private readonly mapper: ValidationFeedbackMapper;
  private readonly fixCandidateGenerator: FixCandidateGenerator;

  public constructor(options: ValidationFailureContextBuilderOptions = {}) {
    this.analyzer = options.analyzer ?? new ValidationResultAnalyzer();
    this.mapper = options.mapper ?? new ValidationFeedbackMapper();
    this.fixCandidateGenerator = options.fixCandidateGenerator ?? new FixCandidateGenerator();
  }

  public build(run: ValidationRun): ValidationFeedbackReport {
    const context = this.analyzer.analyzeRun(run);
    const decision = this.mapper.map(context.parsedIssues);
    const fixCandidates = this.fixCandidateGenerator.generate(context.parsedIssues);

    return {
      context,
      decision,
      fixCandidates,
      createdAt: new Date().toISOString(),
    };
  }
}
