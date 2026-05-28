import { createServer } from 'node:net';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runCli } from '../cli.js';
import { LocalAppLauncher } from '../launcher/LocalAppLauncher.js';
import { LocalAppLauncherError } from '../launcher/LocalAppLauncherTypes.js';

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
  assert(output.stdout.length === 1, 'Expected one stdout line.');

  const parsed = JSON.parse(output.stdout[0] ?? '') as unknown;

  assert(
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed),
    'Expected JSON object.',
  );

  return parsed as Record<string, unknown>;
}

function readPreflight(json: Record<string, unknown>): Record<string, unknown> {
  const preflight = json['preflight'];

  assert(
    typeof preflight === 'object' && preflight !== null && !Array.isArray(preflight),
    'Expected preflight object.',
  );

  return preflight as Record<string, unknown>;
}

function readIssues(preflight: Record<string, unknown>): Record<string, unknown>[] {
  const issues = preflight['issues'];

  assert(Array.isArray(issues), 'Expected issues array.');

  return issues.filter(
    (issue): issue is Record<string, unknown> =>
      typeof issue === 'object' && issue !== null && !Array.isArray(issue),
  );
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

const root = join('.runtime', 'runtime-launcher-preflight-test');
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

const validDryRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--api-port',
  '17881',
  '--ui-port',
  '5181',
  '--ui-dir',
  validUiDir,
]);

assert(validDryRun.exitCode === 0, 'Expected valid preflight exit code 0.');

const validJson = parseSingleJson(validDryRun);
const validPreflight = readPreflight(validJson);

assert(validJson['status'] === 'ok', 'Expected valid launcher status ok.');
assert(validPreflight['status'] === 'passed', 'Expected valid preflight passed.');

const missingUiRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--api-port',
  '17882',
  '--ui-port',
  '5182',
  '--ui-dir',
  missingUiDir,
]);

assert(missingUiRun.exitCode === 1, 'Expected missing UI exit code 1.');

const missingUiJson = parseSingleJson(missingUiRun);
const missingUiPreflight = readPreflight(missingUiJson);
const missingUiIssues = readIssues(missingUiPreflight);

assert(missingUiJson['status'] === 'error', 'Expected missing UI status error.');
assert(missingUiPreflight['status'] === 'failed', 'Expected missing UI preflight failed.');
assert(
  missingUiIssues.some((issue) => issue['code'] === 'ui_dir_missing'),
  'Expected ui_dir_missing issue.',
);

const missingPackageRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--api-port',
  '17883',
  '--ui-port',
  '5183',
  '--ui-dir',
  missingPackageDir,
]);

assert(missingPackageRun.exitCode === 1, 'Expected missing package exit code 1.');

const missingPackageJson = parseSingleJson(missingPackageRun);
const missingPackageIssues = readIssues(readPreflight(missingPackageJson));

assert(
  missingPackageIssues.some((issue) => issue['code'] === 'ui_package_missing'),
  'Expected ui_package_missing issue.',
);

const missingNodeModulesRun = await captureRun([
  'runtime',
  '--dry-run',
  '--no-open',
  '--api-port',
  '17884',
  '--ui-port',
  '5184',
  '--ui-dir',
  missingNodeModulesDir,
]);

assert(missingNodeModulesRun.exitCode === 1, 'Expected missing node_modules exit code 1.');

const missingNodeModulesJson = parseSingleJson(missingNodeModulesRun);
const missingNodeModulesIssues = readIssues(readPreflight(missingNodeModulesJson));

assert(
  missingNodeModulesIssues.some((issue) => issue['code'] === 'ui_node_modules_missing'),
  'Expected ui_node_modules_missing issue.',
);

await withBusyPort('127.0.0.1', 17885, async () => {
  const busyApiRun = await captureRun([
    'runtime',
    '--dry-run',
    '--no-open',
    '--api-port',
    '17885',
    '--ui-port',
    '5185',
    '--ui-dir',
    validUiDir,
  ]);

  assert(busyApiRun.exitCode === 1, 'Expected busy API port exit code 1.');

  const busyApiJson = parseSingleJson(busyApiRun);
  const busyApiIssues = readIssues(readPreflight(busyApiJson));

  assert(
    busyApiIssues.some((issue) => issue['code'] === 'api_port_busy'),
    'Expected api_port_busy issue.',
  );
});

await withBusyPort('127.0.0.1', 5186, async () => {
  const busyUiRun = await captureRun([
    'runtime',
    '--dry-run',
    '--no-open',
    '--api-port',
    '17886',
    '--ui-port',
    '5186',
    '--ui-dir',
    validUiDir,
  ]);

  assert(busyUiRun.exitCode === 1, 'Expected busy UI port exit code 1.');

  const busyUiJson = parseSingleJson(busyUiRun);
  const busyUiIssues = readIssues(readPreflight(busyUiJson));

  assert(
    busyUiIssues.some((issue) => issue['code'] === 'ui_port_busy'),
    'Expected ui_port_busy issue.',
  );
});

const launcher = new LocalAppLauncher();

try {
  await launcher.start({
    apiPort: 17887,
    uiPort: 5187,
    uiDir: missingUiDir,
    openBrowser: false,
    dryRun: true,
  });

  throw new Error('Expected launcher to reject missing UI directory.');
} catch (error: unknown) {
  assert(error instanceof LocalAppLauncherError, 'Expected LocalAppLauncherError.');
  assert(error.result.preflight.status === 'failed', 'Expected failed preflight result.');
  assert(
    error.result.preflight.issues.some((issue) => issue.code === 'ui_dir_missing'),
    'Expected ui_dir_missing issue in thrown result.',
  );
}

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-launcher-preflight-test',
      checks: [
        'valid-preflight',
        'missing-ui-dir',
        'missing-package-json',
        'missing-node-modules',
        'busy-api-port',
        'busy-ui-port',
        'launcher-error-result',
      ],
    },
    null,
    2,
  ),
);
