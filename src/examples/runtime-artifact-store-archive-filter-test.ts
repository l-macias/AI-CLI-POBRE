import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeArtifactStore } from '../artifacts/RuntimeArtifactStore.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const runtimeRoot = path.resolve('.runtime/runtime-artifact-store-archive-filter-test');

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(runtimeRoot, 'reports'), {
  recursive: true,
});

await mkdir(path.join(runtimeRoot, 'archive', 'sessions', 'session-old', 'reports'), {
  recursive: true,
});

await writeFile(path.join(runtimeRoot, 'reports', 'session-active.md'), '# Active\n', 'utf8');

await writeFile(
  path.join(runtimeRoot, 'archive', 'sessions', 'session-old', 'reports', 'session-old.md'),
  '# Archived\n',
  'utf8',
);

const index = await new RuntimeArtifactStore({
  rootDir: runtimeRoot,
}).index();

assert(
  index.artifacts.length === 1,
  `Expected 1 active artifact. Received ${index.artifacts.length}.`,
);
assert(index.artifacts[0]?.path === 'reports/session-active.md', 'Expected only active report.');
assert(
  index.artifacts.every((artifact) => !artifact.path.startsWith('archive/')),
  'Expected archived artifacts to be hidden from main artifact index.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-artifact-store-archive-filter-test',
      indexedArtifacts: index.artifacts.map((artifact) => artifact.path),
    },
    null,
    2,
  ),
);

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});
