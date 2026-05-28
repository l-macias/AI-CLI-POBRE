import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { CliRunner } from './cli/CliRunner.js';
import type { CliOutputFormat } from './cli/CliTypes.js';
import { LocalAppLauncher } from './launcher/LocalAppLauncher.js';
import {
  LocalAppLauncherError,
  type LocalAppLauncherOptions,
} from './launcher/LocalAppLauncherTypes.js';

interface RuntimeLauncherCliOptions extends LocalAppLauncherOptions {
  help: boolean;
}

export async function runCli(argv: string[]): Promise<number> {
  if (argv[0] === 'runtime') {
    return runRuntimeLauncher(argv.slice(1));
  }

  const runner = new CliRunner();
  const result = await runner.run(argv);
  const format = resolveOutputFormat(argv);

  console.log(runner.format(result, format));

  return result.status === 'error' ? 1 : 0;
}

async function runRuntimeLauncher(argv: string[]): Promise<number> {
  const options = parseRuntimeLauncherOptions(argv);

  if (options.help) {
    console.log(formatRuntimeLauncherHelp());
    return 0;
  }

  const launcher = new LocalAppLauncher();

  try {
    const result = await launcher.start({
      host: options.host,
      apiPort: options.apiPort,
      uiHost: options.uiHost,
      uiPort: options.uiPort,
      uiDir: options.uiDir,
      openBrowser: options.openBrowser,
      dryRun: options.dryRun,
    });

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          command: 'zero runtime',
          apiUrl: result.apiUrl,
          uiUrl: result.uiUrl,
          uiCommand: result.uiCommand,
          openBrowser: result.openBrowser,
          mode: result.status,
          preflight: result.preflight,
        },
        null,
        2,
      ),
    );

    if (result.status === 'planned') {
      return 0;
    }

    await waitForShutdown(launcher);

    return 0;
  } catch (error: unknown) {
    if (error instanceof LocalAppLauncherError) {
      console.log(
        JSON.stringify(
          {
            status: 'error',
            command: 'zero runtime',
            message: error.message,
            apiUrl: error.result.apiUrl,
            uiUrl: error.result.uiUrl,
            uiCommand: error.result.uiCommand,
            openBrowser: error.result.openBrowser,
            mode: error.result.status,
            preflight: error.result.preflight,
          },
          null,
          2,
        ),
      );

      return 1;
    }

    throw error;
  }
}

function parseRuntimeLauncherOptions(argv: string[]): RuntimeLauncherCliOptions {
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    host: readStringFlag(argv, '--host') ?? '127.0.0.1',
    apiPort: readNumberFlag(argv, '--api-port') ?? 17871,
    uiHost: readStringFlag(argv, '--ui-host') ?? '127.0.0.1',
    uiPort: readNumberFlag(argv, '--ui-port') ?? 5173,
    uiDir: readStringFlag(argv, '--ui-dir') ?? 'ui',
    openBrowser: !argv.includes('--no-open'),
    dryRun: argv.includes('--dry-run'),
  };
}

function readStringFlag(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);

  if (index < 0) {
    return undefined;
  }

  const value = argv[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function readNumberFlag(argv: string[], flag: string): number | undefined {
  const value = readStringFlag(argv, flag);

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error(`Invalid numeric value for ${flag}: ${value}.`);
  }

  return parsed;
}

function formatRuntimeLauncherHelp(): string {
  return [
    'Zero Runtime local app launcher',
    '',
    'Usage:',
    '  zero runtime [options]',
    '',
    'Options:',
    '  --dry-run             Run preflight and print planned API/UI launch without starting processes.',
    '  --no-open             Do not open the browser automatically.',
    '  --host <host>         Runtime API host. Default: 127.0.0.1',
    '  --api-port <port>     Runtime API port. Default: 17871',
    '  --ui-host <host>      UI dev server host. Default: 127.0.0.1',
    '  --ui-port <port>      UI dev server port. Default: 5173',
    '  --ui-dir <path>       UI directory. Default: ui',
    '  --help, -h            Show this help.',
    '',
    'Preflight checks:',
    '  - UI directory exists.',
    '  - UI package.json exists.',
    '  - UI node_modules exists.',
    '  - npm is available.',
    '  - API/UI ports are available.',
    '',
    'Examples:',
    '  npm run runtime',
    '  npm run runtime:dry',
    '  npm run cli -- runtime --dry-run --no-open --api-port 17872 --ui-port 5174',
  ].join('\n');
}

async function waitForShutdown(launcher: LocalAppLauncher): Promise<void> {
  await new Promise<void>((resolveShutdown) => {
    const shutdown = (signal: string): void => {
      console.log(`\n${signal} received. Stopping Zero Runtime...`);

      void launcher.stop().finally(() => {
        resolveShutdown();
      });
    };

    process.once('SIGINT', () => {
      shutdown('SIGINT');
    });

    process.once('SIGTERM', () => {
      shutdown('SIGTERM');
    });
  });
}

function resolveOutputFormat(argv: readonly string[]): CliOutputFormat {
  const formatIndex = argv.indexOf('--format');
  const requestedFormat = formatIndex >= 0 ? argv[formatIndex + 1] : undefined;

  return requestedFormat === 'json' ? 'json' : 'text';
}

function isCliEntrypoint(): boolean {
  const entrypoint = process.argv[1];

  if (!entrypoint) {
    return false;
  }

  return import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
  runCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
