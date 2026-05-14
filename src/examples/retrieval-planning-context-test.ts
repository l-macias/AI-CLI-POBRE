import { PlanningContextRetriever } from '../retrieval/PlanningContextRetriever.js';

async function main(): Promise<void> {
  const retriever = new PlanningContextRetriever();

  const result = await retriever.retrieve({
    objective: 'Modify RuntimeLoop to use FailureRecovery after blocked step execution.',
    module: 'Runtime Loop',
    maxChunks: 6,
  });

  console.log({
    query: result.query,
    returnedChunks: result.retrieval.chunks.length,
    filesScanned: result.retrieval.filesScanned,
    chunksScanned: result.retrieval.chunksScanned,
    topFiles: result.retrieval.chunks.map((item) => item.chunk.filePath),
    contextPreview: result.context.slice(0, 700),
  });

  if (result.retrieval.chunks.length === 0) {
    throw new Error('Expected retrieval planning context to return chunks.');
  }

  const hasRelevantRuntimeFile = result.retrieval.chunks.some((item) => {
    return (
      item.chunk.filePath.includes('RuntimeLoop') ||
      item.chunk.filePath.includes('Failure') ||
      item.chunk.filePath.includes('AgentRuntime')
    );
  });

  if (!hasRelevantRuntimeFile) {
    throw new Error('Expected retrieval to include runtime/failure related files.');
  }

  console.log('\nSession 23.5 retrieval planning context test completed.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
