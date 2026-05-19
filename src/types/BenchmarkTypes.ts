import type { RuntimeMetricsSummary } from './ObservabilityTypes.js';
import type { JsonObject } from './SharedTypes.js';
import type { ValidationRun } from './ValidationTypes.js';

export type BenchmarkCaseCategory =
  | 'typescript_error_fix'
  | 'eslint_fix'
  | 'react_refactor'
  | 'next_build_issue'
  | 'jest_failing_test'
  | 'package_migration'
  | 'multi_file_import_refactor'
  | 'runtime_loop_recovery'
  | 'retrieval_guided_edit'
  | 'custom';

export type BenchmarkCaseStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export type BenchmarkExpectationKind =
  | 'file_exists'
  | 'file_contains'
  | 'metric_equals'
  | 'metric_at_least'
  | 'validation_status'
  | 'custom';

export interface BenchmarkExpectation {
  id: string;
  kind: BenchmarkExpectationKind;
  description: string;
  target: string;
  expectedValue?: string | number | boolean | undefined;
}

export interface BenchmarkFixtureFile {
  relativePath: string;
  content: string;
}

export interface BenchmarkFixture {
  id: string;
  name: string;
  description: string;
  files: BenchmarkFixtureFile[];
}

export interface BenchmarkCaseInput {
  id: string;
  name: string;
  category: BenchmarkCaseCategory;
  description: string;
  fixture: BenchmarkFixture;
  expectations: BenchmarkExpectation[];
  metadata?: JsonObject | undefined;
}

export interface BenchmarkCaseContext {
  caseId: string;
  fixturePath: string;
  startedAt: string;
}

export interface BenchmarkCaseExecutionOutput {
  stepsExecuted: number;
  actionsBlocked: number;
  approvalsRequired: number;
  replans: number;
  recoveries: number;
  metadata?: JsonObject | undefined;
}

export interface BenchmarkCaseResult {
  caseId: string;
  name: string;
  category: BenchmarkCaseCategory;
  status: BenchmarkCaseStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fixturePath: string;
  output: BenchmarkCaseExecutionOutput;
  validation?: ValidationRun | undefined;
  issues: BenchmarkIssue[];
  observability: RuntimeMetricsSummary;
}

export interface BenchmarkIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface BenchmarkCase {
  readonly input: BenchmarkCaseInput;

  run(context: BenchmarkCaseContext): Promise<BenchmarkCaseExecutionOutput>;
}

export interface BenchmarkRun {
  id: string;
  status: BenchmarkCaseStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: BenchmarkCaseResult[];
  summary: BenchmarkRunSummary;
}

export interface BenchmarkRunSummary {
  totalCases: number;
  passed: number;
  failed: number;
  skipped: number;
  successRate: number;
  totalDurationMs: number;
  totalStepsExecuted: number;
  totalActionsBlocked: number;
  totalApprovalsRequired: number;
  totalReplans: number;
  totalRecoveries: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalEstimatedUsd: number;
}

export interface BenchmarkReporterOutput {
  markdown: string;
  json: JsonObject;
}
