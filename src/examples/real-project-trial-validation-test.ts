import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { RealProjectTrialReporter } from '../real-project-trial/RealProjectTrialReporter.js';
import { RealProjectTrialRunner } from '../real-project-trial/RealProjectTrialRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const fixtureRoot = resolve('.runtime/real-project-trial-validation-test-project');
const reportPath = resolve('.runtime/real-project-trial-validation-test.md');

await rm(fixtureRoot, {
  recursive: true,
  force: true,
});

await mkdir(join(fixtureRoot, 'src/components/sections'), {
  recursive: true,
});

await writeFile(
  join(fixtureRoot, 'package.json'),
  JSON.stringify(
    {
      name: 'betz-hairstyles-validation-fixture',
      private: true,
      scripts: {
        build: 'node ./scripts/fail-build.mjs',
      },
      dependencies: {
        next: '15.1.0',
        react: '19.0.0',
        'react-dom': '19.0.0',
      },
      devDependencies: {
        typescript: '^5',
      },
    },
    null,
    2,
  ),
  'utf8',
);

await mkdir(join(fixtureRoot, 'scripts'), {
  recursive: true,
});

await writeFile(
  join(fixtureRoot, 'scripts/fail-build.mjs'),
  `console.error('Failed to compile');
console.error('src/components/sections/TheArtist.tsx:12:7');
console.error('Type error: Expected string but received number.');
process.exit(1);
`,
  'utf8',
);

await writeFile(
  join(fixtureRoot, 'tsconfig.json'),
  '{"compilerOptions":{"strict":true}}\n',
  'utf8',
);
await writeFile(
  join(fixtureRoot, 'next.config.mjs'),
  'const nextConfig = {};\nexport default nextConfig;\n',
  'utf8',
);
await writeFile(join(fixtureRoot, '.env.local'), 'SECRET_KEY=must-not-be-read\n', 'utf8');
await writeFile(
  join(fixtureRoot, 'src/components/sections/TheArtist.tsx'),
  'export function TheArtist() { return <section>Artist</section>; }\n',
  'utf8',
);

const runner = new RealProjectTrialRunner({
  reporter: new RealProjectTrialReporter({
    outputPath: reportPath,
  }),
});

const report = await runner.validate({
  projectName: 'Betz Peinados',
  targetProjectRoot: fixtureRoot,
  objective: 'Validate error in src/components/sections/TheArtist.tsx',
  allowWrites: true,
  allowCommandExecution: true,
  targetFiles: ['src/components/sections/TheArtist.tsx'],
});

assert(report.status === 'inspected', 'Expected trial to inspect project.');
assert(typeof report.validation !== 'undefined', 'Expected validation summary.');

const validation = report.validation;

if (typeof validation === 'undefined') {
  throw new Error('Expected validation summary.');
}

assert(validation.status === 'failed', 'Expected validation to fail.');
assert(validation.commands.length === 1, 'Expected one validation command.');
assert(validation.commands[0]?.scriptName === 'build', 'Expected build validation.');
assert(validation.findings.length >= 1, 'Expected at least one error finding.');

const hasTheArtistFinding = validation.findings.some((finding) => {
  return (
    finding.relatedFile?.replaceAll('\\', '/').includes('src/components/sections/TheArtist.tsx') ===
    true
  );
});

if (!hasTheArtistFinding) {
  console.log(
    JSON.stringify(
      {
        message: 'Debug validation output',
        commands: validation.commands.map((command) => ({
          scriptName: command.scriptName,
          status: command.status,
          exitCode: command.exitCode,
          stdout: command.stdout,
          stderr: command.stderr,
          findings: validation.findings,
        })),
      },
      null,
      2,
    ),
  );
}

assert(hasTheArtistFinding, 'Expected finding related to TheArtist.tsx.');

const serialized = JSON.stringify(report);

assert(!serialized.includes('must-not-be-read'), 'Sensitive env value leaked.');

await rm(fixtureRoot, {
  recursive: true,
  force: true,
});

console.log(
  JSON.stringify({
    message: 'Real project trial Phase B validation test completed',
    validationStatus: validation.status,
    findings: validation.findings,
  }),
);
