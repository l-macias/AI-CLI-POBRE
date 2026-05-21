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
  | 'imported_symbol'
  | 'namespace_import';

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

export type RelatedFileReason =
  | 'direct_import'
  | 'importer'
  | 'retrieval_match'
  | 'shared_symbol'
  | 'shared_type_reference'
  | 'same_directory'
  | 'nearby_index_file';

export interface RelatedFile {
  filePath: string;
  score: number;
  reasons: RelatedFileReason[];
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
  exportedSymbols?: CodeSymbolScanResult[] | undefined;
  typeReferences?: TypeReferenceScanResult[] | undefined;
  maxRelatedFiles?: number | undefined;
}

export interface TargetExpansionSelection {
  targetFilePath: string;
  scannedFilePaths: string[];
  selectedRelatedFilePaths: string[];
  maxRelatedFiles: number;
  maxFilesToScan: number;
  reasons: string[];
}

export interface CodeIntelligenceReportInput {
  targetFilePath?: string | undefined;
  query?: string | undefined;
  maxChunks?: number | undefined;
  maxRelatedFiles?: number | undefined;
  maxFilesToScan?: number | undefined;
}

export interface CodeIntelligenceReportResult {
  input: CodeIntelligenceReportInput;
  targetFilePath?: string | undefined;
  relationship?: FileRelationship | undefined;
  relatedFiles: RelatedFile[];
  symbols: CodeSymbolScanResult[];
  typeReferences: TypeReferenceScanResult[];
  targetExpansion?: TargetExpansionSelection | undefined;
  retrieval: RetrievalResult;
  createdAt: string;
}
