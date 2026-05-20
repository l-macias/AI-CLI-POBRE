import type { RuntimeContextSource } from '../types/ContextTypes.js';
import { RuntimeInitializer } from '../core/RuntimeInitializer.js';
import { MemoryCompactor } from '../memory/MemoryCompactor.js';
import { TokenEstimator } from '../providers/TokenEstimator.js';

function createRuntimeFixtureSources(): RuntimeContextSource[] {
  return [
    {
      name: '.runtime/current-state.md',
      priority: 'critical',
      content: `# Current State

## Status

Session 50 usability validation is running against deterministic fixture content.

## Notes

- Runtime memory files are provided by the test.
- The test must not depend on local ignored .runtime state.
- Compression output must be generated from known input.
`,
    },
    {
      name: '.runtime/handoff.md',
      priority: 'critical',
      content: `# Handoff

Continue validating Zero Runtime as a deterministic runtime-centered coding agent.
`,
    },
    {
      name: '.runtime/next-steps.md',
      priority: 'high',
      content: `# Next Steps

Keep runtime memory tests deterministic from a clean clone.
`,
    },
    {
      name: '.runtime/active-module.md',
      priority: 'high',
      content: `# Active Module

Context compression deterministic test.
`,
    },
    {
      name: '.runtime/decisions.md',
      priority: 'medium',
      content: `# Decisions

- Runtime tests must create their own fixtures.
- Ignored local .runtime files must not be required for rc:test.
- Compression output must be generated from known input.
`,
    },
    {
      name: '.runtime/progress-log.md',
      priority: 'low',
      content: `# Progress Log

- Created deterministic runtime fixture sources.
- Compacted runtime context.
- Verified compressed context loading.
`,
    },
  ];
}

async function main(): Promise<void> {
  const sources = createRuntimeFixtureSources();

  const compactor = new MemoryCompactor();
  const result = await compactor.compact(sources);

  console.log({
    writtenFiles: result.writtenFiles,
    originalCharacters: result.compression.originalCharacters,
    compressedCharacters: result.compression.compressedCharacters,
    compressionRatio: result.compression.compressionRatio,
    summaryStatus: result.summary.status,
    activeModule: result.summary.activeModule,
  });

  const initializer = new RuntimeInitializer();

  const compressedContext = await initializer.initialize({
    maxEstimatedContextTokens: 5000,
    preferCompressedContext: true,
  });

  const rawContext = await initializer.initialize({
    maxEstimatedContextTokens: 1500,
    preferCompressedContext: false,
  });

  const estimator = new TokenEstimator();

  const compressedTokens = estimator.estimateTextTokens(compressedContext.assembledContext);
  const rawTokens = estimator.estimateTextTokens(rawContext.assembledContext);

  console.log({
    compressedLoadedSources: compressedContext.sources.map((source) => source.name),
    rawLoadedSources: rawContext.sources.map((source) => source.name),
    compressedTokens,
    rawTokens,
  });

  if (!compressedContext.sources.some((source) => source.name === '.runtime/runtime-summary.md')) {
    throw new Error('Expected compressed context to include runtime-summary.md.');
  }

  if (
    !compressedContext.sources.some((source) => source.name === '.runtime/compressed-context.md')
  ) {
    throw new Error('Expected compressed context to include compressed-context.md.');
  }

  if (result.compression.originalCharacters <= 0) {
    throw new Error('Expected runtime fixture to provide raw context content.');
  }

  if (result.compression.compressedCharacters <= 0) {
    throw new Error('Expected compressed-context.md to contain compressed content.');
  }

  if (!result.writtenFiles.includes('.runtime/compressed-context.md')) {
    throw new Error('Expected compressed-context.md to be written.');
  }

  if (!result.writtenFiles.includes('.runtime/runtime-summary.md')) {
    throw new Error('Expected runtime-summary.md to be written.');
  }

  console.log('\nSession 22 context compression test completed.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
