import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { RealProjectTrialReporter } from '../real-project-trial/RealProjectTrialReporter.js';
import { RealProjectTrialRunner } from '../real-project-trial/RealProjectTrialRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const fixtureRoot = resolve('.runtime/real-project-trial-test-project');
const reportPath = resolve('.runtime/real-project-trial-test.md');

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
      name: 'betz-hairstyles-fixture',
      private: true,
      scripts: {
        build: 'next build',
        lint: 'next lint',
      },
      dependencies: {
        next: '15.1.0',
        react: '19.0.0',
        'react-dom': '19.0.0',
      },
      devDependencies: {
        typescript: '^5',
        eslint: '^9',
      },
    },
    null,
    2,
  ),
  'utf8',
);

await writeFile(
  join(fixtureRoot, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        strict: true,
      },
    },
    null,
    2,
  ),
  'utf8',
);

await writeFile(join(fixtureRoot, 'eslint.config.mjs'), 'export default [];\n', 'utf8');
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

const report = await runner.run({
  projectName: 'Betz Peinados',
  targetProjectRoot: fixtureRoot,
  objective: 'Inspect error in src/components/sections/TheArtist.tsx',
  allowWrites: true,
  allowCommandExecution: false,
  targetFiles: ['src/components/sections/TheArtist.tsx'],
});

assert(report.status === 'inspected', 'Expected trial to inspect project.');
assert(
  report.inspection?.configInfo.detectedStack.includes('next') === true,
  'Expected Next stack.',
);
assert(
  report.inspection?.configInfo.detectedStack.includes('typescript') === true,
  'Expected TypeScript stack.',
);
assert(report.inspection?.targetFiles[0]?.exists === true, 'Expected target file to exist.');
assert(
  report.issues.some((issue) => issue.code === 'WRITES_DISABLED_IN_CURRENT_PHASE'),
  'Expected writes disabled warning in current phase.',
);

const blockedReport = await runner.run({
  projectName: 'Betz Peinados',
  targetProjectRoot: fixtureRoot,
  objective: 'Try to target env',
  allowWrites: false,
  allowCommandExecution: false,
  targetFiles: ['.env.local'],
});

assert(blockedReport.status === 'blocked', 'Expected sensitive file targeting to be blocked.');

await rm(fixtureRoot, {
  recursive: true,
  force: true,
});

console.log(
  JSON.stringify({
    message: 'Real project trial Phase A test completed',
    reportStatus: report.status,
    detectedStack: report.inspection?.configInfo.detectedStack,
    targetFiles: report.inspection?.targetFiles,
    blockedStatus: blockedReport.status,
  }),
);
