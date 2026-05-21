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

export type ImportGraphImportKind =
  | 'static_import'
  | 'side_effect_import'
  | 're_export'
  | 'dynamic_import';

export interface ImportGraphEdge {
  from: string;
  to: string;
  importPath?: string | undefined;
  isTypeOnly?: boolean | undefined;
  specifiers?: string[] | undefined;
  importKind?: ImportGraphImportKind | undefined;
}

export interface ImportGraphImport {
  sourceFilePath: string;
  importedPath: string;
  resolvedPath?: string | undefined;
  isTypeOnly: boolean;
  specifiers: string[];
  importKind: ImportGraphImportKind;
}

export interface ImportGraphResult {
  files: string[];
  edges: ImportGraphEdge[];
  imports: ImportGraphImport[];
}
