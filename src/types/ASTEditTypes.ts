import type { DiffFileToolInput } from '../tools/ToolSchemas.js';

export type StructuredEditIntentKind =
  | 'add_import'
  | 'remove_import'
  | 'replace_function'
  | 'replace_function_body'
  | 'add_named_export'
  | 'remove_named_export';

export interface BaseStructuredEditIntent {
  kind: StructuredEditIntentKind;
  targetFilePath: string;
}

export interface AddImportIntent extends BaseStructuredEditIntent {
  kind: 'add_import';
  importStatement: string;
}

export interface RemoveImportIntent extends BaseStructuredEditIntent {
  kind: 'remove_import';
  importStatementIncludes: string;
}

export interface ReplaceFunctionIntent extends BaseStructuredEditIntent {
  kind: 'replace_function';
  functionName: string;
  replacement: string;
}

export interface ReplaceFunctionBodyIntent extends BaseStructuredEditIntent {
  kind: 'replace_function_body';
  functionName: string;
  replacementBody: string;
}

export interface AddNamedExportIntent extends BaseStructuredEditIntent {
  kind: 'add_named_export';
  exportName: string;
}

export interface RemoveNamedExportIntent extends BaseStructuredEditIntent {
  kind: 'remove_named_export';
  exportName: string;
}

export type StructuredEditIntent =
  | AddImportIntent
  | RemoveImportIntent
  | ReplaceFunctionIntent
  | ReplaceFunctionBodyIntent
  | AddNamedExportIntent
  | RemoveNamedExportIntent;

export interface FunctionBoundary {
  functionName: string;
  startLine: number;
  endLine: number;
  bodyStartLine: number;
  bodyEndLine: number;
  startIndex: number;
  endIndex: number;
  bodyStartIndex: number;
  bodyEndIndex: number;
  sourceText: string;
}

export interface StructuredEditIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SafeReplacementPlan {
  targetFilePath: string;
  intent: StructuredEditIntent;
  currentContent: string;
  proposedContent: string;
  changed: boolean;
  affectedStartLine: number;
  affectedEndLine: number;
  issues: StructuredEditIssue[];
}

export interface StructuredEditPreviewLine {
  line: number;
  current: string | null;
  proposed: string | null;
  type: 'same' | 'changed' | 'added' | 'removed';
}

export interface StructuredEditPreview {
  targetFilePath: string;
  intent: StructuredEditIntent;
  changed: boolean;
  affectedStartLine: number;
  affectedEndLine: number;
  previewLines: StructuredEditPreviewLine[];
  proposedContent: string;
  diffFileInput: DiffFileToolInput;
  issues: StructuredEditIssue[];
}

export interface ASTEditToolOutput {
  targetFilePath: string;
  changed: boolean;
  preview: StructuredEditPreview;
}
