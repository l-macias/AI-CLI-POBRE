import type {
  IndexedProjectFile,
  RetrievalQuery,
  RetrievalResult,
} from '../types/RetrievalTypes.js';
import { Chunker } from './Chunker.js';
import { FileIndexer } from './FileIndexer.js';
import { RelevanceScorer } from './RelevanceScorer.js';
import { RetrievalCache } from './RetrievalCache.js';

export interface ContextRetrieverOptions {
  indexer?: FileIndexer | undefined;
  chunker?: Chunker | undefined;
  scorer?: RelevanceScorer | undefined;
  cache?: RetrievalCache | undefined;
}

export class ContextRetriever {
  private readonly indexer: FileIndexer;
  private readonly chunker: Chunker;
  private readonly scorer: RelevanceScorer;
  private readonly cache: RetrievalCache;

  private indexedFiles: IndexedProjectFile[] | null = null;

  public constructor(options: ContextRetrieverOptions = {}) {
    this.indexer = options.indexer ?? new FileIndexer();
    this.chunker = options.chunker ?? new Chunker();
    this.scorer = options.scorer ?? new RelevanceScorer();
    this.cache = options.cache ?? new RetrievalCache();
  }

  public async retrieve(input: RetrievalQuery): Promise<RetrievalResult> {
    const cached = this.cache.get(this.cacheKey(input));

    if (cached) {
      return cached;
    }

    const files = await this.getIndexedFiles();
    const limitedFiles = input.maxFiles ? files.slice(0, input.maxFiles) : files;
    const chunks = this.chunker.chunkFiles(limitedFiles);
    const scored = this.scorer.score(input.query, chunks);
    const maxChunks = input.maxChunks ?? 8;

    const result: RetrievalResult = {
      query: input.query,
      chunks: scored.slice(0, maxChunks),
      filesScanned: limitedFiles.length,
      chunksScanned: chunks.length,
      createdAt: new Date().toISOString(),
    };

    this.cache.set(this.cacheKey(input), result);

    return result;
  }

  public async index(): Promise<IndexedProjectFile[]> {
    this.indexedFiles = await this.indexer.indexProject();

    return this.indexedFiles;
  }

  private async getIndexedFiles(): Promise<IndexedProjectFile[]> {
    if (this.indexedFiles) {
      return this.indexedFiles;
    }

    return this.index();
  }

  private cacheKey(input: RetrievalQuery): string {
    return `${input.query}|files:${String(input.maxFiles ?? 'all')}|chunks:${String(
      input.maxChunks ?? 8,
    )}`;
  }
}
