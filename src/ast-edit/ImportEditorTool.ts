import type {
  AddImportIntent,
  RemoveImportIntent,
  SafeReplacementPlan,
  StructuredEditIssue,
} from '../types/ASTEditTypes.js';

export class ImportEditorTool {
  public addImport(currentContent: string, intent: AddImportIntent): SafeReplacementPlan {
    const normalizedImport = this.normalizeImportStatement(intent.importStatement);
    const issues: StructuredEditIssue[] = [];

    if (!normalizedImport.startsWith('import ')) {
      issues.push({
        code: 'INVALID_IMPORT_STATEMENT',
        message: 'Import statement must start with "import ".',
        severity: 'error',
      });

      return this.createPlan(
        intent.targetFilePath,
        intent,
        currentContent,
        currentContent,
        1,
        1,
        issues,
      );
    }

    if (currentContent.includes(normalizedImport)) {
      issues.push({
        code: 'IMPORT_ALREADY_EXISTS',
        message: 'Import statement already exists. No change needed.',
        severity: 'warning',
      });

      return this.createPlan(
        intent.targetFilePath,
        intent,
        currentContent,
        currentContent,
        1,
        1,
        issues,
      );
    }

    const lines = currentContent.split('\n');
    const insertIndex = this.findImportInsertIndex(lines);
    const proposedLines = [...lines];

    proposedLines.splice(insertIndex, 0, normalizedImport);

    return this.createPlan(
      intent.targetFilePath,
      intent,
      currentContent,
      proposedLines.join('\n'),
      insertIndex + 1,
      insertIndex + 1,
      issues,
    );
  }

  public removeImport(currentContent: string, intent: RemoveImportIntent): SafeReplacementPlan {
    const lines = currentContent.split('\n');
    const matchingIndexes = lines
      .map((line, index) => ({
        line,
        index,
      }))
      .filter((item) => {
        return (
          item.line.trim().startsWith('import ') &&
          item.line.includes(intent.importStatementIncludes)
        );
      });

    const issues: StructuredEditIssue[] = [];

    if (matchingIndexes.length !== 1) {
      issues.push({
        code: 'AMBIGUOUS_IMPORT_REMOVAL',
        message: `Expected exactly one matching import, found ${String(matchingIndexes.length)}.`,
        severity: 'error',
      });

      return this.createPlan(
        intent.targetFilePath,
        intent,
        currentContent,
        currentContent,
        1,
        1,
        issues,
      );
    }

    const match = matchingIndexes[0];

    if (!match) {
      return this.createPlan(
        intent.targetFilePath,
        intent,
        currentContent,
        currentContent,
        1,
        1,
        issues,
      );
    }

    const proposedLines = lines.filter((_line, index) => index !== match.index);

    return this.createPlan(
      intent.targetFilePath,
      intent,
      currentContent,
      proposedLines.join('\n'),
      match.index + 1,
      match.index + 1,
      issues,
    );
  }

  private normalizeImportStatement(statement: string): string {
    const trimmed = statement.trim();

    if (trimmed.endsWith(';')) {
      return trimmed;
    }

    return `${trimmed};`;
  }

  private findImportInsertIndex(lines: string[]): number {
    let lastImportIndex = -1;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';

      if (line.trim().startsWith('import ')) {
        lastImportIndex = index;
      }
    }

    return lastImportIndex + 1;
  }

  private createPlan(
    targetFilePath: string,
    intent: AddImportIntent | RemoveImportIntent,
    currentContent: string,
    proposedContent: string,
    affectedStartLine: number,
    affectedEndLine: number,
    issues: StructuredEditIssue[],
  ): SafeReplacementPlan {
    return {
      targetFilePath,
      intent,
      currentContent,
      proposedContent,
      changed: currentContent !== proposedContent,
      affectedStartLine,
      affectedEndLine,
      issues,
    };
  }
}
