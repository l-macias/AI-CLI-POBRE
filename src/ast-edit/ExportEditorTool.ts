import type {
  AddNamedExportIntent,
  RemoveNamedExportIntent,
  SafeReplacementPlan,
  StructuredEditIssue,
} from '../types/ASTEditTypes.js';

const namedExportLinePattern = /^\s*export\s*\{([^}]+)\}\s*;?\s*$/;

export class ExportEditorTool {
  public addNamedExport(currentContent: string, intent: AddNamedExportIntent): SafeReplacementPlan {
    const lines = currentContent.split('\n');
    const issues: StructuredEditIssue[] = [];

    if (this.hasNamedExport(lines, intent.exportName)) {
      issues.push({
        code: 'EXPORT_ALREADY_EXISTS',
        message: `Named export "${intent.exportName}" already exists.`,
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

    const exportLineIndex = this.findLastNamedExportLineIndex(lines);

    if (exportLineIndex === null) {
      const proposedContent = `${currentContent.trimEnd()}\n\nexport { ${intent.exportName} };\n`;

      return this.createPlan(
        intent.targetFilePath,
        intent,
        currentContent,
        proposedContent,
        lines.length + 2,
        lines.length + 2,
        issues,
      );
    }

    const currentLine = lines[exportLineIndex];

    if (currentLine === undefined) {
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

    const names = this.extractExportNames(currentLine);
    const proposedNames = [...new Set([...names, intent.exportName])].sort();
    const proposedLines = [...lines];

    proposedLines[exportLineIndex] = `export { ${proposedNames.join(', ')} };`;

    return this.createPlan(
      intent.targetFilePath,
      intent,
      currentContent,
      proposedLines.join('\n'),
      exportLineIndex + 1,
      exportLineIndex + 1,
      issues,
    );
  }

  public removeNamedExport(
    currentContent: string,
    intent: RemoveNamedExportIntent,
  ): SafeReplacementPlan {
    const lines = currentContent.split('\n');
    const matchingIndexes = lines
      .map((line, index) => ({
        line,
        index,
      }))
      .filter((item) => {
        return this.extractExportNames(item.line).includes(intent.exportName);
      });

    const issues: StructuredEditIssue[] = [];

    if (matchingIndexes.length !== 1) {
      issues.push({
        code: 'AMBIGUOUS_EXPORT_REMOVAL',
        message: `Expected exactly one matching export, found ${String(matchingIndexes.length)}.`,
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

    const remainingNames = this.extractExportNames(match.line).filter((name) => {
      return name !== intent.exportName;
    });

    const proposedLines =
      remainingNames.length === 0
        ? lines.filter((_line, index) => index !== match.index)
        : lines.map((line, index) => {
            if (index !== match.index) {
              return line;
            }

            return `export { ${remainingNames.join(', ')} };`;
          });

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

  private hasNamedExport(lines: string[], exportName: string): boolean {
    return lines.some((line) => this.extractExportNames(line).includes(exportName));
  }

  private findLastNamedExportLineIndex(lines: string[]): number | null {
    let lastIndex: number | null = null;

    for (let index = 0; index < lines.length; index += 1) {
      if (namedExportLinePattern.test(lines[index] ?? '')) {
        lastIndex = index;
      }
    }

    return lastIndex;
  }

  private extractExportNames(line: string): string[] {
    const match = namedExportLinePattern.exec(line);
    const body = match?.[1];

    if (!body) {
      return [];
    }

    return body
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => {
        const [name] = item.split(/\s+as\s+/);
        return name?.replace(/^type\s+/, '').trim();
      })
      .filter((item): item is string => item !== undefined && item.length > 0);
  }

  private createPlan(
    targetFilePath: string,
    intent: AddNamedExportIntent | RemoveNamedExportIntent,
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
