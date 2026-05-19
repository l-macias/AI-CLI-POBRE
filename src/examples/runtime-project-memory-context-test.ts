import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { RuntimeInitializer } from '../core/RuntimeInitializer.js';
import { ArchitectureFactStore } from '../memory/ArchitectureFactStore.js';
import { ProjectDecisionLog } from '../memory/ProjectDecisionLog.js';
import { ProjectMemoryStore } from '../memory/ProjectMemoryStore.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = join(process.cwd(), '.runtime/runtime-project-memory-context-test/project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(testRoot, {
  recursive: true,
});

const store = new ProjectMemoryStore({
  projectRoot: testRoot,
  projectName: 'Runtime Project Memory Context Test',
});

const decisions = new ProjectDecisionLog({
  store,
});

const architecture = new ArchitectureFactStore({
  store,
});

await decisions.recordDecision({
  title: 'Memory is runtime-controlled context',
  decision: 'Project memory can be included as runtime context but cannot execute actions.',
  rationale: 'Memory should inform planning and repair, not bypass validation or approval.',
  importance: 'critical',
  tags: ['memory', 'runtime'],
});

await architecture.rememberKnownFile({
  path: 'src/core/RuntimeInitializer.ts',
  summary: 'Loads runtime context sources and optionally includes project memory.',
  importance: 'high',
  tags: ['runtime', 'context'],
});

const initializer = new RuntimeInitializer();

const withoutMemory = await initializer.initialize({
  maxEstimatedContextTokens: 5000,
  preferCompressedContext: false,
  includeProjectMemory: false,
  projectRoot: testRoot,
  projectName: 'Runtime Project Memory Context Test',
});

assert(
  !withoutMemory.sources.some((source) => source.name === '.runtime/project-memory.json'),
  'Runtime context should not include project memory unless explicitly enabled.',
);

const withMemory = await initializer.initialize({
  maxEstimatedContextTokens: 5000,
  preferCompressedContext: false,
  includeProjectMemory: true,
  projectRoot: testRoot,
  projectName: 'Runtime Project Memory Context Test',
});

assert(
  withMemory.sources.some((source) => source.name === '.runtime/project-memory.json'),
  'Runtime context should include project memory when explicitly enabled.',
);
assert(
  withMemory.assembledContext.includes('Memory is runtime-controlled context'),
  'Assembled context should include project memory decision.',
);
assert(
  withMemory.assembledContext.includes('RuntimeInitializer.ts'),
  'Assembled context should include known file memory.',
);

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-project-memory-context-test',
      withoutMemorySources: withoutMemory.sources.map((source) => source.name),
      withMemorySources: withMemory.sources.map((source) => source.name),
      withMemoryTokenEstimate: withMemory.tokenEstimate,
    },
    null,
    2,
  ),
);
