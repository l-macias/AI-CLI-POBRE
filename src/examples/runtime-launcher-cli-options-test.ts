import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runCli } from '../cli.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

interface CapturedRun {
  exitCode: number;
  stdout: string[];
}

async function captureRun(argv: string[]): Promise<CapturedRun> {
  const originalLog = console.log;
  const stdout: string[] = [];

  console.log = (value?: unknown, ...extra: unknown[]) => {
    stdout.push([value, ...extra].map((item) => String(item)).join(' '));
  };

  try {
    const exitCode = await runCli(argv);

    return {
      exitCode,
      stdout,
    };
  } finally {
    console.log = originalLog;
  }
}

function parseJsonObject(output: CapturedRun): Record<string, unknown> {
  assert(output.stdout.length === 1, 'Expected exactly one stdout line.');

  const parsed = JSON.parse(output.stdout[0] ?? '') as unknown;

  assert(
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed),
    'Expected JSON object.',
  );

  return parsed as Record<string, unknown>;
}

const uiDir = join('.runtime', 'runtime-launcher-cli-options-test', 'ui');

await rm('.runtime/runtime-launcher-cli-options-test', {
  recursive: true,
  force: true,
});

await mkdir(join(uiDir, 'node_modules'), {
  recursive: true,
});

await writeFile(
  join(uiDir, 'package.json'),
  JSON.stringify(
    {
      scripts: {
        dev: 'vite',
      },
    },
    null,
    2,
  ),
);

const dryRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--host',
  '127.0.0.1',
  '--api-port',
  '17872',
  '--ui-host',
  '127.0.0.1',
  '--ui-port',
  '5174',
  '--ui-dir',
  uiDir,
]);

assert(dryRun.exitCode === 0, 'Expected dry-run exit code 0.');

const dryRunJson = parseJsonObject(dryRun);

assert(dryRunJson['status'] === 'ok', 'Expected status ok.');
assert(dryRunJson['command'] === 'zero runtime', 'Expected zero runtime command.');
assert(dryRunJson['apiUrl'] === 'http://127.0.0.1:17872', 'Expected custom API URL.');
assert(dryRunJson['uiUrl'] === 'http://127.0.0.1:5174', 'Expected custom UI URL.');
assert(dryRunJson['openBrowser'] === false, 'Expected browser disabled.');
assert(dryRunJson['mode'] === 'planned', 'Expected planned dry-run mode.');

const preflight = dryRunJson['preflight'];

assert(typeof preflight === 'object' && preflight !== null, 'Expected preflight object.');
assert((preflight as Record<string, unknown>)['status'] === 'passed', 'Expected preflight passed.');

const uiCommand = dryRunJson['uiCommand'];

assert(typeof uiCommand === 'string', 'Expected uiCommand string.');
assert(uiCommand.includes('cd '), 'Expected ui command to include cd.');
assert(uiCommand.includes('npm run dev'), 'Expected ui command to use npm run dev.');
assert(uiCommand.includes('--host 127.0.0.1'), 'Expected custom UI host.');
assert(uiCommand.includes('--port 5174'), 'Expected custom UI port.');

const helpRun = await captureRun(['runtime', '--help']);

assert(helpRun.exitCode === 0, 'Expected help exit code 0.');
assert(helpRun.stdout.length === 1, 'Expected help output.');
assert(helpRun.stdout[0]?.includes('Zero Runtime local app launcher'), 'Expected launcher help.');
assert(helpRun.stdout[0]?.includes('--api-port <port>'), 'Expected api-port help.');
assert(helpRun.stdout[0]?.includes('--ui-port <port>'), 'Expected ui-port help.');
assert(helpRun.stdout[0]?.includes('Preflight checks:'), 'Expected preflight help.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-launcher-cli-options-test',
      customDryRun: dryRunJson,
      help: 'available',
    },
    null,
    2,
  ),
);
