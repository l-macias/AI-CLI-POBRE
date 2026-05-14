import { MemoryCompactor } from '../memory/MemoryCompactor.js';
import { RuntimeInitializer } from '../core/RuntimeInitializer.js';
import { TokenEstimator } from '../providers/TokenEstimator.js';

async function main(): Promise<void> {
  const initializer = new RuntimeInitializer();
  const sources = await initializer.loadRawRuntimeSources();

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
