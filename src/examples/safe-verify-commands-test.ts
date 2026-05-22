import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PackageScriptScanner } from '../verify/PackageScriptScanner.js';
import { VerifyCommandPolicy } from '../verify/VerifyCommandPolicy.js';
import { VerifyCommandRegistry } from '../verify/VerifyCommandRegistry.js';
import { VerifyRunner } from '../verify/VerifyRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/safe-verify-commands-test');
const projectRoot = path.join(testRoot, 'project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(projectRoot, {
  recursive: true,
});

await writeFile(
  path.join(projectRoot, 'package.json'),
  JSON.stringify(
    {
      scripts: {
        build: 'echo build-ok',
        lint: 'echo lint-ok',
        typecheck: 'echo typecheck-ok',
        dangerous: 'rm -rf .',
      },
    },
    null,
    2,
  ),
  'utf8',
);

const registry = new VerifyCommandRegistry();
const commands = registry.list();

assert(commands.length === 4, 'registry should expose four commands');
assert(
  registry.findByLabel('npm run build')?.id === 'npm-build',
  'registry should find build command',
);

const packageScripts = await new PackageScriptScanner().scan(projectRoot);

assert(packageScripts.safeVerifyScripts.includes('build'), 'scanner should detect build');
assert(packageScripts.safeVerifyScripts.includes('lint'), 'scanner should detect lint');
assert(packageScripts.safeVerifyScripts.includes('typecheck'), 'scanner should detect typecheck');
assert(
  !packageScripts.safeVerifyScripts.includes('dangerous'),
  'scanner should ignore dangerous script name',
);

const policy = new VerifyCommandPolicy();

const missingApproval = policy.evaluate({
  command: 'npm',
  args: ['run', 'build'],
  cwd: projectRoot,
  approvalState: 'missing',
});

assert(!missingApproval.allowed, 'policy should block without approval');

const dangerousCommand = policy.evaluate({
  command: 'npm',
  args: ['run', 'build', '&&', 'rm', '-rf', '.'],
  cwd: projectRoot,
  approvalState: 'approved',
});

assert(!dangerousCommand.allowed, 'policy should block dangerous chained command');

const allowed = policy.evaluate({
  command: 'npm',
  args: ['run', 'build'],
  cwd: projectRoot,
  approvalState: 'approved',
});

assert(allowed.allowed, 'policy should allow approved build command');

const runner = new VerifyRunner({
  timeoutMs: 10_000,
});

const blockedRun = await runner.run({
  command: 'npm',
  args: ['run', 'build'],
  cwd: projectRoot,
  approvalState: 'missing',
});

assert(blockedRun.status === 'blocked', 'runner should block missing approval');

const executedRun = await runner.run({
  command: 'npm',
  args: ['run', 'build'],
  cwd: projectRoot,
  approvalState: 'approved',
});

assert(executedRun.status === 'executed', 'runner should execute approved safe command');
assert(executedRun.exitCode === 0, 'build command should exit with code 0');
assert(
  executedRun.stdoutSummary.includes('build-ok'),
  'stdout summary should include build output',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'safe-verify-commands-test',
      registry: commands.map((command) => command.label),
      safeScripts: packageScripts.safeVerifyScripts,
      blocked: {
        command: blockedRun.command,
        issues: blockedRun.issues,
      },
      executed: {
        command: executedRun.command,
        exitCode: executedRun.exitCode,
        stdoutSummary: executedRun.stdoutSummary,
      },
    },
    null,
    2,
  ),
);
