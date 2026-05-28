import { mkdir, rm, writeFile } from 'node:fs/promises';
import { RuntimeArtifactStore } from '../artifacts/RuntimeArtifactStore.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const rootDir = '.runtime/artifact-store-sandbox-recovery-test';

await rm(rootDir, {
  recursive: true,
  force: true,
});

await mkdir(`${rootDir}/sandbox-results/session-artifact-test`, {
  recursive: true,
});

await mkdir(`${rootDir}/patch-recoveries/session-artifact-test`, {
  recursive: true,
});

await writeFile(
  `${rootDir}/sandbox-results/session-artifact-test/sandbox-result.json`,
  `${JSON.stringify(
    {
      id: 'sandbox-result',
      status: 'failed',
      sessionId: 'session-artifact-test',
    },
    null,
    2,
  )}\n`,
  'utf8',
);

await writeFile(
  `${rootDir}/patch-recoveries/session-artifact-test/recovery-result.json`,
  `${JSON.stringify(
    {
      id: 'recovery-result',
      status: 'repair_prompt_ready',
      sessionId: 'session-artifact-test',
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const store = new RuntimeArtifactStore({
  rootDir,
});

const index = await store.index();

const sandboxArtifact = index.artifacts.find((artifact) => artifact.kind === 'sandbox_result');
const recoveryArtifact = index.artifacts.find((artifact) => artifact.kind === 'patch_recovery');

if (!sandboxArtifact) {
  throw new Error('Expected sandbox result artifact.');
}

if (!recoveryArtifact) {
  throw new Error('Expected patch recovery artifact.');
}

assert(
  sandboxArtifact.sessionId === 'session-artifact-test',
  'Expected sandbox artifact session id.',
);
assert(
  recoveryArtifact.sessionId === 'session-artifact-test',
  'Expected recovery artifact session id.',
);

const sandboxRead = await store.read('sandbox-results/session-artifact-test/sandbox-result.json');
const recoveryRead = await store.read(
  'patch-recoveries/session-artifact-test/recovery-result.json',
);

assert(sandboxRead.artifact.kind === 'sandbox_result', 'Expected read sandbox kind.');
assert(recoveryRead.artifact.kind === 'patch_recovery', 'Expected read recovery kind.');

console.log(
  JSON.stringify(
    {
      message: 'Runtime artifact store sandbox recovery test completed',
      sandboxArtifact,
      recoveryArtifact,
      sandboxRead: sandboxRead.artifact,
      recoveryRead: recoveryRead.artifact,
    },
    null,
    2,
  ),
);
