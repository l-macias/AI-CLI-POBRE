import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliHelpRenderer } from '../cli/CliHelpRenderer.js';
import { CliRunner } from '../cli/CliRunner.js';
import { Logger } from '../observability/Logger.js';

const logger = new Logger({
  namespace: 'zero-runtime:cli-help-docs-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const renderer = new CliHelpRenderer();
  const help = renderer.render();

  assertIncludes(help, 'Recommended:');
  assertIncludes(help, 'zero quickstart');
  assertIncludes(help, 'Quickstart flow:');
  assertIncludes(help, 'writes .runtime/quickstart-report.md');
  assertIncludes(help, 'Quickstart uses deterministic fake provider only.');
  assertIncludes(help, 'Quickstart runs dry-run before apply.');
  assertIncludes(help, 'Quickstart writes an auditable report artifact.');

  assertIncludes(help, 'zero agent start');
  assertIncludes(help, 'zero agent status');
  assertIncludes(help, 'zero agent actions');
  assertIncludes(help, 'zero agent approvals');
  assertIncludes(help, 'zero agent next');
  assertIncludes(help, 'zero agent approve <approval-id>');
  assertIncludes(help, 'zero agent reject <approval-id>');
  assertIncludes(help, 'zero agent reset --project ./target --confirm-reset');
  assertIncludes(help, 'Agent lifecycle:');
  assertIncludes(help, 'Agent patch application requires a persisted approved approval request.');

  const runner = new CliRunner();
  const helpResult = await runner.run(['help']);

  assertStatus(helpResult.status, 'ok');

  const formattedHelp = runner.format(helpResult, 'text');

  assertIncludes(formattedHelp, 'Zero Runtime CLI');
  assertIncludes(formattedHelp, 'Recommended:');
  assertIncludes(formattedHelp, 'zero quickstart');
  assertIncludes(formattedHelp, 'Quickstart flow:');
  assertIncludes(formattedHelp, 'zero agent start');
  assertIncludes(formattedHelp, 'zero agent step request_repair_proposal');
  assertIncludes(formattedHelp, 'zero agent step apply_patch');

  const docsPath = resolve('docs/cli-agent.md');
  const docs = await readFile(docsPath, 'utf8');

  assertIncludes(docs, '# Zero Runtime CLI Agent');
  assertIncludes(docs, 'zero agent start');
  assertIncludes(docs, 'zero agent approvals');
  assertIncludes(docs, 'zero agent approve <approval-id>');
  assertIncludes(docs, 'zero agent step apply_patch');
  assertIncludes(docs, '## Approval gate');
  assertIncludes(docs, '## Safety model');
  assertIncludes(docs, 'The provider proposes. The runtime controls.');

  logger.info('CLI help docs test completed', {
    helpIncludesQuickstart: help.includes('zero quickstart'),
    helpIncludesAgent: help.includes('zero agent start'),
    docsPath,
    docsIncludesApprovalGate: docs.includes('## Approval gate'),
  });

  logger.info('Session 47.G CLI quickstart help polish test passed');
}

function assertStatus(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected status "${expected}", received "${actual}".`);
  }
}

function assertIncludes(value: string, expected: string): void {
  if (!value.includes(expected)) {
    throw new Error(`Expected output to include "${expected}".`);
  }
}

main().catch((error: unknown) => {
  logger.error('CLI help docs test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
