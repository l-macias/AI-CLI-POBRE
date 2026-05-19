import { pathToFileURL } from 'node:url';
import { CliRunner } from './cli/CliRunner.js';
import type { CliOutputFormat } from './cli/CliTypes.js';

export async function runCli(argv: string[]): Promise<number> {
  const runner = new CliRunner();
  const result = await runner.run(argv);
  const format = resolveOutputFormat(argv);

  console.log(runner.format(result, format));

  return result.status === 'error' ? 1 : 0;
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
