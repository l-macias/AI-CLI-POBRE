import { rm } from 'node:fs/promises';
import path from 'node:path';
import { VerifyRunStore } from '../verify/VerifyRunStore.js';
import type { VerifyRunResult } from '../verify/VerifyRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/verify-run-store-test');
const sessionId = 'session-81-h-test';
const now = new Date().toISOString();

await rm(testRoot, {
  recursive: true,
  force: true,
});

const store = new VerifyRunStore({
  rootDir: path.join(testRoot, 'verify-runs'),
});

const run: VerifyRunResult = {
  command: 'npm run build',
  cwd: 'C:/Users/LUCAS/Desktop/zero',
  status: 'executed',
  exitCode: 0,
  stdoutSummary: 'build ok',
  stderrSummary: '',
  issues: [],
  startedAt: now,
  completedAt: now,
  durationMs: 500,
};

const saved = await store.add({
  sessionId,
  run,
});

assert(saved.runs.length === 1, 'should save one verify run');

const loaded = await store.load(sessionId);

assert(loaded.runs.length === 1, 'should load one verify run');
assert(loaded.runs[0]?.command === 'npm run build', 'loaded command should match');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'verify-run-store-test',
      sessionId,
      runs: loaded.runs.length,
      path: store.resolvePath(sessionId),
    },
    null,
    2,
  ),
);
