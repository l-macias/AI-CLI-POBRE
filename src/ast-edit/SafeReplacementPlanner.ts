import type {
  SafeReplacementPlan,
  StructuredEditIntent,
  StructuredEditIssue,
} from '../types/ASTEditTypes.js';
import { ExportEditorTool } from './ExportEditorTool.js';
import { FunctionBoundaryDetector } from './FunctionBoundaryDetector.js';
import { ImportEditorTool } from './ImportEditorTool.js';

export interface SafeReplacementPlannerOptions {
  functionBoundaryDetector?: FunctionBoundaryDetector | undefined;
  importEditor?: ImportEditorTool | undefined;
  exportEditor?: ExportEditorTool | undefined;
}

export class SafeReplacementPlanner {
  private readonly functionBoundaryDetector: FunctionBoundaryDetector;
  private readonly importEditor: ImportEditorTool;
  private readonly exportEditor: ExportEditorTool;

  public constructor(options: SafeReplacementPlannerOptions = {}) {
    this.functionBoundaryDetector =
      options.functionBoundaryDetector ?? new FunctionBoundaryDetector();
    this.importEditor = options.importEditor ?? new ImportEditorTool();
    this.exportEditor = options.exportEditor ?? new ExportEditorTool();
  }

  public plan(currentContent: string, intent: StructuredEditIntent): SafeReplacementPlan {
    if (intent.kind === 'add_import') {
      return this.importEditor.addImport(currentContent, intent);
    }

    if (intent.kind === 'remove_import') {
      return this.importEditor.removeImport(currentContent, intent);
    }

    if (intent.kind === 'add_named_export') {
      return this.exportEditor.addNamedExport(currentContent, intent);
    }

    if (intent.kind === 'remove_named_export') {
      return this.exportEditor.removeNamedExport(currentContent, intent);
    }

    if (intent.kind === 'replace_function') {
      return this.planReplaceFunction(currentContent, intent);
    }

    return this.planReplaceFunctionBody(currentContent, intent);
  }

  private planReplaceFunction(
    currentContent: string,
    intent: Extract<StructuredEditIntent, { kind: 'replace_function' }>,
  ): SafeReplacementPlan {
    const boundary = this.functionBoundaryDetector.findFunction(
      currentContent,
      intent.functionName,
    );

    const issues: StructuredEditIssue[] = [];

    if (!boundary) {
      issues.push({
        code: 'FUNCTION_BOUNDARY_NOT_FOUND_OR_AMBIGUOUS',
        message: `Could not uniquely detect function boundary for "${intent.functionName}".`,
        severity: 'error',
      });

      return this.createUnchangedPlan(currentContent, intent, issues);
    }

    const replacement = intent.replacement.trimEnd();
    const proposedContent = [
      currentContent.slice(0, boundary.startIndex),
      replacement,
      currentContent.slice(boundary.endIndex),
    ].join('');

    return {
      targetFilePath: intent.targetFilePath,
      intent,
      currentContent,
      proposedContent,
      changed: currentContent !== proposedContent,
      affectedStartLine: boundary.startLine,
      affectedEndLine: boundary.endLine,
      issues,
    };
  }

  private planReplaceFunctionBody(
    currentContent: string,
    intent: Extract<StructuredEditIntent, { kind: 'replace_function_body' }>,
  ): SafeReplacementPlan {
    const boundary = this.functionBoundaryDetector.findFunction(
      currentContent,
      intent.functionName,
    );

    const issues: StructuredEditIssue[] = [];

    if (!boundary) {
      issues.push({
        code: 'FUNCTION_BOUNDARY_NOT_FOUND_OR_AMBIGUOUS',
        message: `Could not uniquely detect function boundary for "${intent.functionName}".`,
        severity: 'error',
      });

      return this.createUnchangedPlan(currentContent, intent, issues);
    }

    const replacementBody = this.normalizeFunctionBody(intent.replacementBody);
    const proposedContent = [
      currentContent.slice(0, boundary.bodyStartIndex),
      replacementBody,
      currentContent.slice(boundary.bodyEndIndex),
    ].join('');

    return {
      targetFilePath: intent.targetFilePath,
      intent,
      currentContent,
      proposedContent,
      changed: currentContent !== proposedContent,
      affectedStartLine: boundary.bodyStartLine,
      affectedEndLine: boundary.bodyEndLine,
      issues,
    };
  }

  private normalizeFunctionBody(body: string): string {
    const trimmed = body.trim();

    if (trimmed.length === 0) {
      return '\n';
    }

    const indentedLines = trimmed.split('\n').map((line) => {
      return `  ${line}`;
    });

    return `\n${indentedLines.join('\n')}\n`;
  }

  private createUnchangedPlan(
    currentContent: string,
    intent: StructuredEditIntent,
    issues: StructuredEditIssue[],
  ): SafeReplacementPlan {
    return {
      targetFilePath: intent.targetFilePath,
      intent,
      currentContent,
      proposedContent: currentContent,
      changed: false,
      affectedStartLine: 1,
      affectedEndLine: 1,
      issues,
    };
  }
}
