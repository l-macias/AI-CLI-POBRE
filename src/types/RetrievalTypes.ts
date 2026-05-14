export interface IndexedProjectFile {
  path: string;
  content: string;
  sizeBytes: number;
  indexedAt: string;
}

export interface ProjectChunk {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  characterCount: number;
}

export interface RetrievalQuery {
  query: string;
  maxFiles?: number | undefined;
  maxChunks?: number | undefined;
  excludePaths?: string[] | undefined;
}

export interface ScoredChunk {
  chunk: ProjectChunk;
  score: number;
  matchedTerms: string[];
}

export interface RetrievalResult {
  query: string;
  chunks: ScoredChunk[];
  filesScanned: number;
  chunksScanned: number;
  createdAt: string;
}

export interface ImportGraphEdge {
  from: string;
  to: string;
  importPath?: string | undefined;
  isTypeOnly?: boolean | undefined;
  specifiers?: string[] | undefined;
}

export interface ImportGraphImport {
  sourceFilePath: string;
  importedPath: string;
  resolvedPath?: string | undefined;
  isTypeOnly: boolean;
  specifiers: string[];
}

export interface ImportGraphResult {
  files: string[];
  edges: ImportGraphEdge[];
  imports: ImportGraphImport[];
}
