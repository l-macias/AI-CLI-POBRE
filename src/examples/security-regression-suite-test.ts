import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SecurityRegressionSuite } from '../security/SecurityRegressionSuite.js';
import { SecurityReviewReporter } from '../security/SecurityReviewReporter.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const runtimeRoot = resolve('.runtime/security-regression-suite-test');
  const projectRoot = resolve(runtimeRoot, 'project');
  const outputPath = resolve(runtimeRoot, 'security-review-report.json');

  await rm(runtimeRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(projectRoot, {
    recursive: true,
  });

  const suite = new SecurityRegressionSuite({
    reporter: new SecurityReviewReporter({
      outputPath,
    }),
  });

  const result = await suite.run({
    projectName: 'Security Regression Suite Fixture',
    projectRoot,
  });

  assert(
    result.outputPath === outputPath,
    'Security regression suite should write to configured output path.',
  );

  assert(result.report.version === 1, 'Security regression report should use version 1.');

  assert(
    result.report.summary.status === 'failed',
    'Security regression suite intentionally includes malicious fixtures and should fail.',
  );

  assert(
    result.report.summary.criticalFindings > 0,
    'Security regression suite should include critical findings.',
  );

  assert(
    result.report.findings.some((finding) => finding.category === 'secret_leak'),
    'Security regression suite should include secret leak findings.',
  );

  assert(
    result.report.findings.some((finding) => finding.category === 'sensitive_path'),
    'Security regression suite should include sensitive path findings.',
  );

  assert(
    result.report.findings.some((finding) => finding.category === 'prompt_injection'),
    'Security regression suite should include prompt injection findings.',
  );

  assert(
    result.report.findings.some((finding) => finding.category === 'patch_threat'),
    'Security regression suite should include patch threat findings.',
  );

  assert(
    result.report.findings.some((finding) => finding.category === 'memory_poisoning'),
    'Security regression suite should include memory poisoning findings.',
  );

  const rawReport = await readFile(outputPath, 'utf8');

  assert(
    !rawReport.includes('regression-secret-should-not-leak'),
    'Security review report must not leak secret material.',
  );

  assert(
    rawReport.includes('[REDACTED]'),
    'Security review report should include redaction marker.',
  );

  const parsed = JSON.parse(rawReport) as unknown;

  assert(
    typeof parsed === 'object' && parsed !== null,
    'Security review report should be valid JSON.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'security-regression-suite-test',
        reportStatus: result.report.summary.status,
        totalFindings: result.report.summary.totalFindings,
        outputPath: result.outputPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'security-regression-suite-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
