import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runCli } from '../cli.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

interface CapturedOutput {
  exitCode: number;
  stdout: string[];
}

async function captureRun(argv: string[]): Promise<CapturedOutput> {
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

function parseSingleJsonOutput(output: CapturedOutput): Record<string, unknown> {
  assert(output.stdout.length === 1, 'Expected exactly one stdout line.');

  const firstLine = output.stdout[0];

  if (!firstLine) {
    throw new Error('Expected stdout line.');
  }

  const parsed = JSON.parse(firstLine) as unknown;

  assert(
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed),
    'Expected JSON object output.',
  );

  return parsed as Record<string, unknown>;
}

const uiDir = join('.runtime', 'mvp-cli-entrypoint-lock-test', 'ui');

await rm('.runtime/mvp-cli-entrypoint-lock-test', {
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

const runtimeDryRun = await captureRun(['runtime', '--dry-run', '--no-open', '--ui-dir', uiDir]);

assert(runtimeDryRun.exitCode === 0, 'Expected runtime dry-run exit code 0.');

const runtimeDryRunJson = parseSingleJsonOutput(runtimeDryRun);

assert(runtimeDryRunJson['status'] === 'ok', 'Expected runtime launcher status ok.');
assert(runtimeDryRunJson['command'] === 'zero runtime', 'Expected zero runtime command label.');
assert(runtimeDryRunJson['apiUrl'] === 'http://127.0.0.1:17871', 'Expected default API URL.');
assert(runtimeDryRunJson['uiUrl'] === 'http://127.0.0.1:5173', 'Expected default UI URL.');
assert(runtimeDryRunJson['openBrowser'] === false, 'Expected --no-open to disable browser.');
assert(runtimeDryRunJson['mode'] === 'planned', 'Expected dry-run launcher mode planned.');

const preflight = runtimeDryRunJson['preflight'];

assert(typeof preflight === 'object' && preflight !== null, 'Expected preflight object.');
assert((preflight as Record<string, unknown>)['status'] === 'passed', 'Expected preflight passed.');

const uiCommand = runtimeDryRunJson['uiCommand'];

assert(typeof uiCommand === 'string', 'Expected uiCommand string.');
assert(uiCommand.includes('npm run dev'), 'Expected ui command to start Vite dev server.');
assert(uiCommand.includes('--host 127.0.0.1'), 'Expected UI host in command.');
assert(uiCommand.includes('--port 5173'), 'Expected UI port in command.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'mvp-cli-entrypoint-lock-test',
      runtimeDryRun: runtimeDryRunJson,
    },
    null,
    2,
  ),
);
