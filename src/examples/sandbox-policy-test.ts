import { SandboxManager } from '../sandbox/SandboxManager.js';
import type { SandboxPolicyDecision } from '../types/SandboxTypes.js';

function main(): void {
  const manager = new SandboxManager();

  const allowedTypecheck = manager.evaluate({
    command: 'npm',
    args: ['run', 'typecheck'],
    cwd: '.',
  });

  const allowedLint = manager.evaluate({
    command: 'npm',
    args: ['run', 'lint'],
    cwd: '.',
    timeoutMs: 60_000,
    maxOutputBytes: 100_000,
  });

  const blockedGitStatus = manager.evaluate({
    command: 'git',
    args: ['status'],
    cwd: '.',
  });

  const blockedRmRf = manager.evaluate({
    command: 'rm',
    args: ['-rf', '.'],
    cwd: '.',
  });

  const blockedNetworkRequest = manager.evaluate({
    command: 'npm',
    args: ['run', 'lint'],
    cwd: '.',
    networkAccess: true,
  });

  const blockedNpmInstall = manager.evaluate({
    command: 'npm',
    args: ['install', 'left-pad'],
    cwd: '.',
    networkAccess: true,
  });

  const blockedNodeScript = manager.evaluate({
    command: 'node',
    args: ['script.js'],
    cwd: '.',
  });

  const blockedProtectedCwd = manager.evaluate({
    command: 'npm',
    args: ['run', 'lint'],
    cwd: 'node_modules',
  });

  const blockedHugeOutput = manager.evaluate({
    command: 'npm',
    args: ['run', 'lint'],
    cwd: '.',
    maxOutputBytes: 2_000_000,
  });

  console.log({
    allowedTypecheck,
    allowedLint,
    blockedGitStatus,
    blockedRmRf,
    blockedNetworkRequest,
    blockedNpmInstall,
    blockedNodeScript,
    blockedProtectedCwd,
    blockedHugeOutput,
  });

  assertDecision(allowedTypecheck, 'allowed');
  assertDecision(allowedLint, 'allowed');
  assertDecision(blockedGitStatus, 'blocked');
  assertDecision(blockedRmRf, 'blocked');
  assertDecision(blockedNetworkRequest, 'blocked');
  assertDecision(blockedNpmInstall, 'blocked');
  assertDecision(blockedNodeScript, 'blocked');
  assertDecision(blockedProtectedCwd, 'blocked');
  assertDecision(blockedHugeOutput, 'blocked');

  assertIssue(blockedGitStatus, 'SANDBOX_COMMAND_RISK_BLOCKED');
  assertIssue(blockedRmRf, 'SANDBOX_COMMAND_RISK_BLOCKED');
  assertIssue(blockedNetworkRequest, 'SANDBOX_NETWORK_BLOCKED');
  assertIssue(blockedNpmInstall, 'SANDBOX_COMMAND_ARGS_NOT_ALLOWED');
  assertIssue(blockedNodeScript, 'SANDBOX_COMMAND_NOT_REGISTERED');
  assertIssue(blockedProtectedCwd, 'SANDBOX_PROTECTED_CWD_BLOCKED');
  assertIssue(blockedHugeOutput, 'SANDBOX_OUTPUT_LIMIT_EXCEEDED');

  console.log('\nSession 29 sandbox policy test passed.');
}

function assertDecision(
  decision: SandboxPolicyDecision,
  expected: SandboxPolicyDecision['status'],
): void {
  if (decision.status !== expected) {
    throw new Error(`Expected decision "${expected}", received "${decision.status}".`);
  }
}

function assertIssue(decision: SandboxPolicyDecision, code: string): void {
  if (!decision.issues.some((issue) => issue.code === code)) {
    throw new Error(
      `Expected issue "${code}". Received: ${decision.issues
        .map((issue) => issue.code)
        .join(', ')}`,
    );
  }
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  process.exitCode = 1;
}
