import { ContextRetriever } from '../retrieval/ContextRetriever.js';
import { FileIndexer } from '../retrieval/FileIndexer.js';
import { ImportGraph } from '../retrieval/ImportGraph.js';
import type {
  CodeIntelligenceReportInput,
  CodeIntelligenceReportResult,
} from '../types/CodeIntelligenceTypes.js';
import type { IndexedProjectFile } from '../types/RetrievalTypes.js';
import { CodeSymbolScanner } from './CodeSymbolScanner.js';
import { FileRelationshipMap } from './FileRelationshipMap.js';
import { TypeReferenceScanner } from './TypeReferenceScanner.js';

export interface CodeIntelligenceReportOptions {
  indexer?: FileIndexer | undefined;
  retriever?: ContextRetriever | undefined;
  importGraph?: ImportGraph | undefined;
  relationshipMap?: FileRelationshipMap | undefined;
  symbolScanner?: CodeSymbolScanner | undefined;
  typeReferenceScanner?: TypeReferenceScanner | undefined;
}

export class CodeIntelligenceReport {
  private readonly indexer: FileIndexer;
  private readonly retriever: ContextRetriever;
  private readonly importGraph: ImportGraph;
  private readonly relationshipMap: FileRelationshipMap;
  private readonly symbolScanner: CodeSymbolScanner;
  private readonly typeReferenceScanner: TypeReferenceScanner;

  public constructor(options: CodeIntelligenceReportOptions = {}) {
    this.indexer = options.indexer ?? new FileIndexer();
    this.retriever = options.retriever ?? new ContextRetriever();
    this.importGraph = options.importGraph ?? new ImportGraph();
    this.relationshipMap = options.relationshipMap ?? new FileRelationshipMap();
    this.symbolScanner = options.symbolScanner ?? new CodeSymbolScanner();
    this.typeReferenceScanner = options.typeReferenceScanner ?? new TypeReferenceScanner();
  }

  public async generate(input: CodeIntelligenceReportInput): Promise<CodeIntelligenceReportResult> {
    const query = this.buildQuery(input);
    const files = await this.indexer.indexProject();

    const retrieval = await this.retriever.retrieve({
      query,
      maxChunks: input.maxChunks ?? 8,
      excludePaths: ['src/examples/', '.runtime/'],
    });

    const graph = this.importGraph.build(files);
    const targetFile = this.resolveTargetFile(input, files, retrieval.chunks);
    const relationship = targetFile
      ? this.relationshipMap.buildForFile(targetFile.path, graph, retrieval.chunks)
      : undefined;

    const filesToScan = this.selectFilesToScan(
      files,
      targetFile?.path,
      relationship?.relatedFiles.map((file) => file.filePath) ?? [],
    );

    const symbols = filesToScan.map((file) => this.symbolScanner.scan(file));
    const typeReferences = filesToScan.map((file) => this.typeReferenceScanner.scan(file));

    const result: CodeIntelligenceReportResult = {
      input,
      relatedFiles: relationship?.relatedFiles ?? [],
      symbols,
      typeReferences,
      retrieval,
      createdAt: new Date().toISOString(),
    };

    if (targetFile) {
      result.targetFilePath = targetFile.path;
    }

    if (relationship) {
      result.relationship = relationship;
    }

    return result;
  }

  private buildQuery(input: CodeIntelligenceReportInput): string {
    const parts = [input.targetFilePath, input.query].filter(
      (item): item is string => item !== undefined && item.trim().length > 0,
    );

    if (parts.length === 0) {
      return 'code intelligence project relationships imports exports types';
    }

    return parts.join(' ');
  }

  private resolveTargetFile(
    input: CodeIntelligenceReportInput,
    files: IndexedProjectFile[],
    retrievalChunks: CodeIntelligenceReportResult['retrieval']['chunks'],
  ): IndexedProjectFile | null {
    if (input.targetFilePath) {
      const exact = files.find((file) => file.path === input.targetFilePath);

      if (exact) {
        return exact;
      }
    }

    const firstChunk = retrievalChunks[0];

    if (!firstChunk) {
      return null;
    }

    return files.find((file) => file.path === firstChunk.chunk.filePath) ?? null;
  }

  private selectFilesToScan(
    files: IndexedProjectFile[],
    targetFilePath: string | undefined,
    relatedFilePaths: string[],
  ): IndexedProjectFile[] {
    const selectedPaths = new Set<string>();

    if (targetFilePath) {
      selectedPaths.add(targetFilePath);
    }

    for (const relatedFilePath of relatedFilePaths.slice(0, 6)) {
      selectedPaths.add(relatedFilePath);
    }

    if (selectedPaths.size === 0) {
      return files.slice(0, 6);
    }

    return files.filter((file) => {
      return selectedPaths.has(file.path) && !file.path.startsWith('src/examples/');
    });
  }
}
