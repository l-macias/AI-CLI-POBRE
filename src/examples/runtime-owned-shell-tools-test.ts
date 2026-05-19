import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Logger } from '../observability/Logger.js';
import type { ToolExecutionRequest, ToolExecutionResult } from '../types/ToolTypes.js';
import { ToolExecutionValidator } from '../tools/ToolExecutionValidator.js';
import { ToolPermissionManager } from '../tools/ToolPermissionManager.js';
import { ToolPermissionPolicy } from '../tools/ToolPermissionPolicy.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ToolRuntimeExecutor } from '../tools/ToolRuntimeExecutor.js';
import { BuildCommandTool } from '../tools/shell/BuildCommandTool.js';
import { DryRunCommandTool } from '../tools/shell/DryRunCommandTool.js';
import { NpmScriptTool } from '../tools/shell/NpmScriptTool.js';
import { TestCommandTool } from '../tools/shell/TestCommandTool.js';

const logger = new Logger({
  namespace: 'zero-runtime:runtime-owned-shell-tools-test',
  level: 'debug',
});

const testCwd = '.runtime/sandbox-tests/runtime-owned-shell';
const testRoot = path.resolve(process.cwd(), testCwd);

let requestSequence = 0;

async function main(): Promise<void> {
  await resetTestRoot();

  const registry = new ToolRegistry();

  registry.register(new DryRunCommandTool());
  registry.register(new NpmScriptTool());
  registry.register(new TestCommandTool());
  registry.register(new BuildCommandTool());

  const executor = new ToolRuntimeExecutor({
    validator: new ToolExecutionValidator({
      registry,
      permissionPolicy: new ToolPermissionPolicy({
        allowedPermissions: ['read', 'execute'],
      }),
    }),
    permissionManager: new ToolPermissionManager({
      allowedPermissions: ['read', 'execute'],
    }),
  });

  const allowedDryRun = await executor.execute(
    createRequest({
      toolName: 'dry_run_command',
      requestInput: {
        command: 'npm',
        args: ['run', 'lint'],
        cwd: testCwd,
      },
    }),
  );

  const blockedDryRun = await executor.execute(
    createRequest({
      toolName: 'dry_run_command',
      requestInput: {
        command: 'rm',
        args: ['-rf', '.'],
        cwd: testCwd,
      },
    }),
  );

  const blockedPathArgDryRun = await executor.execute(
    createRequest({
      toolName: 'dry_run_command',
      requestInput: {
        command: 'npm',
        args: ['run', 'lint'],
        cwd: testCwd,
        pathArgs: ['.env'],
      },
    }),
  );

  const npmTypecheck = await executor.execute(
    createRequest({
      toolName: 'npm_script',
      requestInput: {
        script: 'typecheck',
        cwd: testCwd,
        timeoutMs: 120_000,
        maxOutputBytes: 200_000,
        executeConfirmed: true,
      },
    }),
  );

  const buildCommand = await executor.execute(
    createRequest({
      toolName: 'build_command',
      requestInput: {
        cwd: testCwd,
        timeoutMs: 120_000,
        maxOutputBytes: 200_000,
        executeConfirmed: true,
      },
    }),
  );

  const testCommand = await executor.execute(
    createRequest({
      toolName: 'test_command',
      requestInput: {
        cwd: testCwd,
        timeoutMs: 120_000,
        maxOutputBytes: 200_000,
        executeConfirmed: true,
      },
    }),
  );

  const blockedProtectedCwd = await executor.execute(
    createRequest({
      toolName: 'npm_script',
      requestInput: {
        script: 'lint',
        cwd: 'node_modules',
        executeConfirmed: true,
      },
    }),
  );

  const unconfirmedScript = await executor.execute(
    createRequest({
      toolName: 'npm_script',
      requestInput: {
        script: 'lint',
        cwd: testCwd,
        executeConfirmed: false,
      },
    }),
  );

  logger.info('Runtime-owned shell tools test completed', {
    allowedDryRun,
    blockedDryRun,
    blockedPathArgDryRun,
    npmTypecheck,
    buildCommand,
    testCommand,
    blockedProtectedCwd,
    unconfirmedScript,
  });

  assertStatus(allowedDryRun.status, 'executed');
  assertSandboxStatus(allowedDryRun, 'allowed');

  assertStatus(blockedDryRun.status, 'executed');
  assertSandboxStatus(blockedDryRun, 'blocked');

  assertStatus(blockedPathArgDryRun.status, 'executed');
  assertSandboxStatus(blockedPathArgDryRun, 'blocked');

  assertStatus(npmTypecheck.status, 'executed');
  assertStatus(buildCommand.status, 'executed');
  assertStatus(testCommand.status, 'executed');

  assertStatus(blockedProtectedCwd.status, 'not_executed');
  assertStatus(unconfirmedScript.status, 'not_executed');

  logger.info('Session 30 runtime-owned shell tools test passed');
}

async function resetTestRoot(): Promise<void> {
  await rm(testRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(testRoot, {
    recursive: true,
  });

  await writeFile(path.join(testRoot, 'README.md'), '# Runtime-owned shell test\n', 'utf8');

  await writeFile(
    path.join(testRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'runtime-owned-shell-test',
        version: '0.0.0',
        private: true,
        type: 'module',
        scripts: {
          typecheck: 'node -e "console.log(\\"typecheck ok\\")"',
          lint: 'node -e "console.log(\\"lint ok\\")"',
          build: 'node -e "console.log(\\"build ok\\")"',
          test: 'node -e "console.log(\\"test ok\\")"',
        },
      },
      null,
      2,
    ),
    'utf8',
  );
}

function createRequest(input: { toolName: string; requestInput: unknown }): ToolExecutionRequest {
  requestSequence += 1;

  return {
    id: `shell-tool-request-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}-${String(requestSequence).padStart(3, '0')}`,
    toolName: input.toolName,
    input: input.requestInput,
    proposedBy: 'runtime',
    requestedAt: new Date().toISOString(),
  };
}

function assertStatus(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected status "${expected}", received "${actual}".`);
  }
}

function assertSandboxStatus(result: ToolExecutionResult, expected: 'allowed' | 'blocked'): void {
  const output = result.output;

  if (typeof output !== 'object' || output === null) {
    throw new Error('Expected dry run output object.');
  }

  const sandboxStatus = (output as { status?: unknown }).status;

  if (sandboxStatus !== expected) {
    throw new Error(`Expected sandbox status "${expected}", received "${String(sandboxStatus)}".`);
  }
}

main().catch((error: unknown) => {
  logger.error('Runtime-owned shell tools test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
