import type { ImportGraphImport, RetrievalResult, ScoredChunk } from './RetrievalTypes.js';

export type CodeSymbolKind =
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'function'
  | 'const'
  | 'let'
  | 'var'
  | 'default'
  | 'named_export'
  | 'imported_symbol';

export interface CodeSymbol {
  name: string;
  kind: CodeSymbolKind;
  filePath: string;
  line: number;
  sourceText: string;
}

export interface CodeSymbolScanResult {
  filePath: string;
  exports: CodeSymbol[];
  imports: CodeSymbol[];
}

export interface TypeReference {
  name: string;
  filePath: string;
  line: number;
  sourceText: string;
}

export interface TypeReferenceScanResult {
  filePath: string;
  references: TypeReference[];
}

export interface RelatedFile {
  filePath: string;
  score: number;
  reasons: string[];
}

export interface FileRelationship {
  filePath: string;
  imports: ImportGraphImport[];
  importedBy: string[];
  relatedFiles: RelatedFile[];
}

export interface FileRelationshipMapResult {
  relationships: FileRelationship[];
  createdAt: string;
}

export interface RelatedFilesResolverInput {
  filePath: string;
  imports: ImportGraphImport[];
  importedBy: string[];
  retrievalChunks: ScoredChunk[];
}

export interface CodeIntelligenceReportInput {
  targetFilePath?: string | undefined;
  query?: string | undefined;
  maxChunks?: number | undefined;
}

export interface CodeIntelligenceReportResult {
  input: CodeIntelligenceReportInput;
  targetFilePath?: string | undefined;
  relationship?: FileRelationship | undefined;
  relatedFiles: RelatedFile[];
  symbols: CodeSymbolScanResult[];
  typeReferences: TypeReferenceScanResult[];
  retrieval: RetrievalResult;
  createdAt: string;
}
