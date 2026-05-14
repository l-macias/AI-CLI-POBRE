import { Logger } from '../observability/Logger.js';
import type { ValidationRun } from '../types/ValidationTypes.js';
import { ValidationFailureContextBuilder } from '../validation-feedback/ValidationFailureContextBuilder.js';

const logger = new Logger({
  namespace: 'zero-runtime:validation-feedback-test',
  level: 'debug',
});

function main(): void {
  const builder = new ValidationFailureContextBuilder();
  const run = createFailedValidationRun();
  const report = builder.build(run);

  logger.info('Validation feedback report generated', {
    report,
  });

  assertEqual(report.context.status, 'failed');
  assertEqual(report.context.parsedIssues.length, 4);
  assertIncludes(report.context.affectedFiles, 'src/code-intelligence/CodeIntelligenceReport.ts');
  assertIncludes(report.context.affectedFiles, 'src/ast-edit/FunctionBoundaryDetector.ts');
  assertIncludes(report.context.symbols, 'CodeSymbolScanResult');
  assertIncludes(report.context.symbols, 'unusedVariable');
  assertEqual(report.decision.action, 'inspect_related_files');
  assertEqual(report.fixCandidates.length, 3);

  const skippedIssue = report.context.parsedIssues.find((issue) => {
    return issue.category === 'validation_skipped';
  });

  if (!skippedIssue) {
    throw new Error('Expected skipped validation issue to be preserved.');
  }

  const importCandidate = report.fixCandidates.find((candidate) => {
    return candidate.title === 'Resolve missing or invalid import';
  });

  if (!importCandidate) {
    throw new Error('Expected missing import fix candidate.');
  }

  if (!importCandidate.requiresCodeIntelligence) {
    throw new Error('Expected import candidate to require code intelligence.');
  }

  logger.info('Session 24.75 validation feedback test passed');
}

function createFailedValidationRun(): ValidationRun {
  const timestamp = new Date().toISOString();

  return {
    id: 'validation-feedback-test-run',
    status: 'failed',
    startedAt: timestamp,
    finishedAt: timestamp,
    durationMs: 1,
    results: [
      {
        target: {
          kind: 'typescript',
          label: 'TypeScript typecheck',
          command: 'npm run typecheck',
        },
        status: 'failed',
        startedAt: timestamp,
        finishedAt: timestamp,
        durationMs: 1,
        issues: [
          {
            code: 'TS2307',
            message:
              "src/code-intelligence/CodeIntelligenceReport.ts(7,3): error TS2307: Cannot find module './MissingModule.js' or its corresponding type declarations.",
            severity: 'error',
            source: 'npm run typecheck',
          },
          {
            code: 'TS6133',
            message:
              "src/code-intelligence/CodeIntelligenceReport.ts(12,3): error TS6133: 'CodeSymbolScanResult' is declared but its value is never read.",
            severity: 'error',
            source: 'npm run typecheck',
          },
        ],
      },
      {
        target: {
          kind: 'lint',
          label: 'ESLint validation',
          command: 'npm run lint',
        },
        status: 'failed',
        startedAt: timestamp,
        finishedAt: timestamp,
        durationMs: 1,
        issues: [
          {
            code: 'ESLINT_ERROR',
            message:
              "src/ast-edit/FunctionBoundaryDetector.ts:44:9: error 'unusedVariable' is assigned a value but never used @typescript-eslint/no-unused-vars",
            severity: 'error',
            source: 'npm run lint',
          },
        ],
      },
      {
        target: {
          kind: 'build',
          label: 'Project build',
          command: 'npm run build',
        },
        status: 'skipped',
        startedAt: timestamp,
        finishedAt: timestamp,
        durationMs: 0,
        issues: [
          {
            code: 'VALIDATION_COMMAND_NOT_EXECUTED',
            message:
              'Build validation is registered but not executed yet. Command execution is intentionally deferred.',
            severity: 'info',
            source: 'npm run build',
          },
        ],
      },
    ],
  };
}

function assertEqual(actual: string | number, expected: string | number): void {
  if (actual !== expected) {
    throw new Error(`Expected "${String(expected)}", received "${String(actual)}".`);
  }
}

function assertIncludes(values: string[], expected: string): void {
  if (!values.includes(expected)) {
    throw new Error(`Expected values to include "${expected}". Received: ${values.join(', ')}`);
  }
}

try {
  main();
} catch (error: unknown) {
  logger.error('Validation feedback test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
}
