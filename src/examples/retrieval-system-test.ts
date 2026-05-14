import { ContextRetriever } from '../retrieval/ContextRetriever.js';
import { FileIndexer } from '../retrieval/FileIndexer.js';
import { ImportGraph } from '../retrieval/ImportGraph.js';

async function main(): Promise<void> {
  const retriever = new ContextRetriever();

  const result = await retriever.retrieve({
    query: 'RuntimeLoop ExecutionEngine FailureRecovery AgentRuntime',
    maxChunks: 8,
  });

  console.log({
    query: result.query,
    filesScanned: result.filesScanned,
    chunksScanned: result.chunksScanned,
    returnedChunks: result.chunks.length,
    topChunks: result.chunks.map((chunk) => ({
      filePath: chunk.chunk.filePath,
      startLine: chunk.chunk.startLine,
      endLine: chunk.chunk.endLine,
      score: chunk.score,
      matchedTerms: chunk.matchedTerms,
    })),
  });

  if (result.chunks.length === 0) {
    throw new Error('Expected retrieval to return relevant chunks.');
  }

  const indexer = new FileIndexer();
  const files = await indexer.indexProject();

  const graph = new ImportGraph().build(files);

  console.log({
    indexedFiles: files.length,
    importGraphFiles: graph.files.length,
    importGraphEdges: graph.edges.length,
  });

  if (files.length === 0) {
    throw new Error('Expected indexed files.');
  }

  console.log('\nSession 23 retrieval system test completed.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
