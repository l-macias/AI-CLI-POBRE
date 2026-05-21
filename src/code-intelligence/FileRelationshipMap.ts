import { ImportGraph } from '../retrieval/ImportGraph.js';
import type {
  CodeSymbolScanResult,
  FileRelationship,
  FileRelationshipMapResult,
  TypeReferenceScanResult,
} from '../types/CodeIntelligenceTypes.js';
import type {
  ImportGraphResult,
  IndexedProjectFile,
  ScoredChunk,
} from '../types/RetrievalTypes.js';
import { RelatedFilesResolver } from './RelatedFilesResolver.js';

export interface FileRelationshipMapOptions {
  importGraph?: ImportGraph | undefined;
  relatedFilesResolver?: RelatedFilesResolver | undefined;
}

export interface BuildRelationshipOptions {
  exportedSymbols?: CodeSymbolScanResult[] | undefined;
  typeReferences?: TypeReferenceScanResult[] | undefined;
  maxRelatedFiles?: number | undefined;
}

export class FileRelationshipMap {
  private readonly importGraph: ImportGraph;
  private readonly relatedFilesResolver: RelatedFilesResolver;

  public constructor(options: FileRelationshipMapOptions = {}) {
    this.importGraph = options.importGraph ?? new ImportGraph();
    this.relatedFilesResolver = options.relatedFilesResolver ?? new RelatedFilesResolver();
  }

  public build(
    files: IndexedProjectFile[],
    retrievalChunks: ScoredChunk[] = [],
    options: BuildRelationshipOptions = {},
  ): FileRelationshipMapResult {
    const graph = this.importGraph.build(files);
    const relationships = graph.files.map((filePath) => {
      return this.buildRelationship(filePath, graph, retrievalChunks, options);
    });

    return {
      relationships,
      createdAt: new Date().toISOString(),
    };
  }

  public buildForFile(
    filePath: string,
    graph: ImportGraphResult,
    retrievalChunks: ScoredChunk[] = [],
    options: BuildRelationshipOptions = {},
  ): FileRelationship {
    return this.buildRelationship(filePath, graph, retrievalChunks, options);
  }

  private buildRelationship(
    filePath: string,
    graph: ImportGraphResult,
    retrievalChunks: ScoredChunk[],
    options: BuildRelationshipOptions,
  ): FileRelationship {
    const imports = this.importGraph.findImportsForFile(graph, filePath);
    const importedBy = this.importGraph.findImportersOfFile(graph, filePath);

    const relatedFiles = this.relatedFilesResolver.resolve({
      filePath,
      imports,
      importedBy,
      retrievalChunks,
      exportedSymbols: options.exportedSymbols,
      typeReferences: options.typeReferences,
      maxRelatedFiles: options.maxRelatedFiles,
    });

    return {
      filePath,
      imports,
      importedBy,
      relatedFiles,
    };
  }
}
