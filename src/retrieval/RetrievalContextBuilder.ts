import type { ScoredChunk } from '../types/RetrievalTypes.js';

export class RetrievalContextBuilder {
  public build(chunks: ScoredChunk[]): string {
    if (chunks.length === 0) {
      return '# Retrieved Project Context\n\nNo relevant project chunks found.';
    }

    const renderedChunks = chunks.map((item, index) => {
      return `## Retrieved Chunk ${String(index + 1)}

File: ${item.chunk.filePath}
Lines: ${String(item.chunk.startLine)}-${String(item.chunk.endLine)}
Score: ${String(item.score)}
Matched terms: ${item.matchedTerms.join(', ') || 'none'}

\`\`\`
${item.chunk.content.trim()}
\`\`\``;
    });

    return `# Retrieved Project Context

${renderedChunks.join('\n\n---\n\n')}`;
  }
}
