import { createServer } from 'node:net';
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

function parseSingleJson(output: CapturedRun): Record<string, unknown> {
  assert(output.stdout.length === 1, 'Expected exactly one stdout line.');

  const raw = output.stdout[0];

  assert(typeof raw === 'string' && raw.length > 0, 'Expected stdout JSON string.');

  const parsed = JSON.parse(raw) as unknown;

  assert(
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed),
    'Expected JSON object.',
  );

  return parsed as Record<string, unknown>;
}

function readObject(value: unknown, message: string): Record<string, unknown> {
  assert(typeof value === 'object' && value !== null && !Array.isArray(value), message);

  return value as Record<string, unknown>;
}

function readIssues(json: Record<string, unknown>): Record<string, unknown>[] {
  const preflight = readObject(json['preflight'], 'Expected preflight object.');
  const issues = preflight['issues'];

  assert(Array.isArray(issues), 'Expected preflight issues array.');

  return issues.map((issue) => readObject(issue, 'Expected issue object.'));
}

async function withBusyPort<T>(host: string, port: number, callback: () => Promise<T>): Promise<T> {
  const server = createServer();

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, host, () => {
      resolveListen();
    });
  });

  try {
    return await callback();
  } finally {
    await new Promise<void>((resolveClose) => {
      server.close(() => {
        resolveClose();
      });
    });
  }
}

const root = join('.runtime', 'runtime-launcher-final-lock-test');
const validUiDir = join(root, 'valid-ui');
const missingUiDir = join(root, 'missing-ui');
const missingPackageDir = join(root, 'missing-package-ui');
const missingNodeModulesDir = join(root, 'missing-node-modules-ui');

await rm(root, {
  recursive: true,
  force: true,
});

await mkdir(join(validUiDir, 'node_modules'), {
  recursive: true,
});

await writeFile(
  join(validUiDir, 'package.json'),
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

await mkdir(missingPackageDir, {
  recursive: true,
});

await mkdir(missingNodeModulesDir, {
  recursive: true,
});

await writeFile(
  join(missingNodeModulesDir, 'package.json'),
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

const helpRun = await captureRun(['runtime', '--help']);

assert(helpRun.exitCode === 0, 'Expected help exit code 0.');
assert(helpRun.stdout.length === 1, 'Expected one help output.');
assert(helpRun.stdout[0]?.includes('Zero Runtime local app launcher'), 'Expected launcher title.');
assert(helpRun.stdout[0]?.includes('--dry-run'), 'Expected dry-run help.');
assert(helpRun.stdout[0]?.includes('--no-open'), 'Expected no-open help.');
assert(helpRun.stdout[0]?.includes('--api-port <port>'), 'Expected api-port help.');
assert(helpRun.stdout[0]?.includes('--ui-port <port>'), 'Expected ui-port help.');
assert(helpRun.stdout[0]?.includes('Preflight checks:'), 'Expected preflight checks help.');

const defaultDryRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--api-port',
  '17891',
  '--ui-port',
  '5191',
  '--ui-dir',
  validUiDir,
]);

assert(defaultDryRun.exitCode === 0, 'Expected default dry-run exit code 0.');

const defaultDryRunJson = parseSingleJson(defaultDryRun);
const defaultPreflight = readObject(defaultDryRunJson['preflight'], 'Expected preflight object.');

assert(defaultDryRunJson['status'] === 'ok', 'Expected default dry-run status ok.');
assert(defaultDryRunJson['command'] === 'zero runtime', 'Expected zero runtime command.');
assert(defaultDryRunJson['mode'] === 'planned', 'Expected default dry-run planned mode.');
assert(defaultDryRunJson['openBrowser'] === false, 'Expected browser disabled.');
assert(
  defaultDryRunJson['apiUrl'] === 'http://127.0.0.1:17891',
  'Expected default dry-run API URL.',
);
assert(defaultDryRunJson['uiUrl'] === 'http://127.0.0.1:5191', 'Expected default dry-run UI URL.');
assert(defaultPreflight['status'] === 'passed', 'Expected default dry-run preflight passed.');

const customDryRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--host',
  '127.0.0.1',
  '--api-port',
  '17892',
  '--ui-host',
  '127.0.0.1',
  '--ui-port',
  '5192',
  '--ui-dir',
  validUiDir,
]);

assert(customDryRun.exitCode === 0, 'Expected custom dry-run exit code 0.');

const customDryRunJson = parseSingleJson(customDryRun);
const customUiCommand = customDryRunJson['uiCommand'];

assert(customDryRunJson['status'] === 'ok', 'Expected custom dry-run status ok.');
assert(customDryRunJson['apiUrl'] === 'http://127.0.0.1:17892', 'Expected custom API URL.');
assert(customDryRunJson['uiUrl'] === 'http://127.0.0.1:5192', 'Expected custom UI URL.');
assert(typeof customUiCommand === 'string', 'Expected custom UI command string.');
assert(customUiCommand.includes('npm run dev'), 'Expected UI command to run dev server.');
assert(customUiCommand.includes('--host 127.0.0.1'), 'Expected custom UI host in command.');
assert(customUiCommand.includes('--port 5192'), 'Expected custom UI port in command.');

const missingUiRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--api-port',
  '17893',
  '--ui-port',
  '5193',
  '--ui-dir',
  missingUiDir,
]);

assert(missingUiRun.exitCode === 1, 'Expected missing UI exit code 1.');

const missingUiJson = parseSingleJson(missingUiRun);
const missingUiIssues = readIssues(missingUiJson);

assert(missingUiJson['status'] === 'error', 'Expected missing UI status error.');
assert(
  missingUiIssues.some(
    (issue) =>
      issue['code'] === 'ui_dir_missing' &&
      typeof issue['action'] === 'string' &&
      issue['action'].includes('--ui-dir'),
  ),
  'Expected actionable ui_dir_missing issue.',
);

const missingPackageRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--api-port',
  '17894',
  '--ui-port',
  '5194',
  '--ui-dir',
  missingPackageDir,
]);

assert(missingPackageRun.exitCode === 1, 'Expected missing package exit code 1.');

const missingPackageIssues = readIssues(parseSingleJson(missingPackageRun));

assert(
  missingPackageIssues.some(
    (issue) =>
      issue['code'] === 'ui_package_missing' &&
      typeof issue['action'] === 'string' &&
      issue['action'].length > 0,
  ),
  'Expected actionable ui_package_missing issue.',
);

const missingNodeModulesRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--api-port',
  '17895',
  '--ui-port',
  '5195',
  '--ui-dir',
  missingNodeModulesDir,
]);

assert(missingNodeModulesRun.exitCode === 1, 'Expected missing node_modules exit code 1.');

const missingNodeModulesIssues = readIssues(parseSingleJson(missingNodeModulesRun));

assert(
  missingNodeModulesIssues.some(
    (issue) =>
      issue['code'] === 'ui_node_modules_missing' &&
      typeof issue['action'] === 'string' &&
      issue['action'].includes('npm install'),
  ),
  'Expected actionable ui_node_modules_missing issue.',
);

await withBusyPort('127.0.0.1', 17896, async () => {
  const busyApiRun = await captureRun([
    'runtime',
    '--dry-run',
    '--no-open',
    '--api-port',
    '17896',
    '--ui-port',
    '5196',
    '--ui-dir',
    validUiDir,
  ]);

  assert(busyApiRun.exitCode === 1, 'Expected busy API port exit code 1.');

  const busyApiIssues = readIssues(parseSingleJson(busyApiRun));

  assert(
    busyApiIssues.some(
      (issue) =>
        issue['code'] === 'api_port_busy' &&
        typeof issue['action'] === 'string' &&
        issue['action'].includes('--api-port'),
    ),
    'Expected actionable api_port_busy issue.',
  );
});

await withBusyPort('127.0.0.1', 5197, async () => {
  const busyUiRun = await captureRun([
    'runtime',
    '--dry-run',
    '--no-open',
    '--api-port',
    '17897',
    '--ui-port',
    '5197',
    '--ui-dir',
    validUiDir,
  ]);

  assert(busyUiRun.exitCode === 1, 'Expected busy UI port exit code 1.');

  const busyUiIssues = readIssues(parseSingleJson(busyUiRun));

  assert(
    busyUiIssues.some(
      (issue) =>
        issue['code'] === 'ui_port_busy' &&
        typeof issue['action'] === 'string' &&
        issue['action'].includes('--ui-port'),
    ),
    'Expected actionable ui_port_busy issue.',
  );
});

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-launcher-final-lock-test',
      locked: [
        'runtime-help',
        'default-dry-run',
        'custom-dry-run',
        'preflight-ok',
        'missing-ui-dir',
        'missing-ui-package-json',
        'missing-ui-node-modules',
        'busy-api-port',
        'busy-ui-port',
        'actionable-errors',
      ],
    },
    null,
    2,
  ),
);
