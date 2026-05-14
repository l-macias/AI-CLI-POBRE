import { CliRunner } from './cli/CliRunner.js';

async function main(): Promise<void> {
  const runner = new CliRunner();
  const args = process.argv.slice(2);
  const result = await runner.run(args);

  const requestedFormat = args.includes('--format')
    ? args[args.indexOf('--format') + 1]
    : undefined;

  const format = requestedFormat === 'json' ? 'json' : 'text';

  console.log(runner.format(result, format));

  if (result.status === 'error') {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
