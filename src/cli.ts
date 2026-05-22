import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { CliRunner } from './cli/CliRunner.js';
import type { CliOutputFormat } from './cli/CliTypes.js';
import { LocalAppLauncher } from './launcher/LocalAppLauncher.js';

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
  const launcher = new LocalAppLauncher();

  const result = await launcher.start({
    openBrowser: !argv.includes('--no-open'),
    dryRun: argv.includes('--dry-run'),
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
