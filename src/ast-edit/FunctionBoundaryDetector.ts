import type { FunctionBoundary } from '../types/ASTEditTypes.js';

interface FunctionCandidate {
  functionName: string;
  startIndex: number;
}

const functionDeclarationPattern =
  /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;

const constFunctionPattern =
  /(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;

const methodPattern =
  /(?:public|private|protected)?\s*(?:async\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)\s*[:A-Za-z0-9_<>,\s|[\].]*\s*\{/g;

export class FunctionBoundaryDetector {
  public findFunction(content: string, functionName: string): FunctionBoundary | null {
    const boundaries = this.findCandidates(content)
      .filter((candidate) => candidate.functionName === functionName)
      .map((candidate) => this.createBoundary(content, candidate))
      .filter((boundary): boundary is FunctionBoundary => boundary !== null);

    const normalizedBoundaries = this.removeNestedDuplicateBoundaries(boundaries);

    if (normalizedBoundaries.length !== 1) {
      return null;
    }

    return normalizedBoundaries[0] ?? null;
  }

  private removeNestedDuplicateBoundaries(boundaries: FunctionBoundary[]): FunctionBoundary[] {
    const result: FunctionBoundary[] = [];

    for (const boundary of boundaries) {
      const widerBoundary = boundaries.find((candidate) => {
        return (
          candidate !== boundary &&
          candidate.functionName === boundary.functionName &&
          candidate.endIndex === boundary.endIndex &&
          candidate.startIndex < boundary.startIndex
        );
      });

      if (widerBoundary) {
        continue;
      }

      result.push(boundary);
    }

    return result;
  }

  public findAll(content: string): FunctionBoundary[] {
    return this.findCandidates(content)
      .map((candidate) => this.createBoundary(content, candidate))
      .filter((boundary): boundary is FunctionBoundary => boundary !== null);
  }

  private isFunctionDeclarationFalsePositive(content: string, matchIndex: number): boolean {
    const prefix = content.slice(Math.max(0, matchIndex - 30), matchIndex);

    return /\bfunction\s+$/.test(prefix);
  }

  private findCandidates(content: string): FunctionCandidate[] {
    const candidates: FunctionCandidate[] = [];

    for (const match of content.matchAll(functionDeclarationPattern)) {
      const name = match[1];

      if (name === undefined || match.index === undefined) {
        continue;
      }

      candidates.push({
        functionName: name,
        startIndex: match.index,
      });
    }

    for (const match of content.matchAll(constFunctionPattern)) {
      const name = match[1];

      if (name === undefined || match.index === undefined) {
        continue;
      }

      candidates.push({
        functionName: name,
        startIndex: match.index,
      });
    }

    for (const match of content.matchAll(methodPattern)) {
      const name = match[1];

      if (name === undefined || match.index === undefined) {
        continue;
      }

      if (this.isControlKeyword(name)) {
        continue;
      }

      if (this.isFunctionDeclarationFalsePositive(content, match.index)) {
        continue;
      }

      candidates.push({
        functionName: name,
        startIndex: match.index,
      });
    }

    return this.dedupeCandidates(candidates).sort((left, right) => {
      return left.startIndex - right.startIndex;
    });
  }

  private createBoundary(
    content: string,
    candidate: FunctionCandidate | undefined,
  ): FunctionBoundary | null {
    if (!candidate) {
      return null;
    }

    const openingBraceIndex = content.indexOf('{', candidate.startIndex);

    if (openingBraceIndex === -1) {
      return null;
    }

    const closingBraceIndex = this.findMatchingClosingBrace(content, openingBraceIndex);

    if (closingBraceIndex === null) {
      return null;
    }

    const startLine = this.lineNumberAt(content, candidate.startIndex);
    const endLine = this.lineNumberAt(content, closingBraceIndex);
    const bodyStartIndex = openingBraceIndex + 1;
    const bodyEndIndex = closingBraceIndex;
    const bodyStartLine = this.lineNumberAt(content, bodyStartIndex);
    const bodyEndLine = this.lineNumberAt(content, bodyEndIndex);

    return {
      functionName: candidate.functionName,
      startLine,
      endLine,
      bodyStartLine,
      bodyEndLine,
      startIndex: candidate.startIndex,
      endIndex: closingBraceIndex + 1,
      bodyStartIndex,
      bodyEndIndex,
      sourceText: content.slice(candidate.startIndex, closingBraceIndex + 1),
    };
  }

  private findMatchingClosingBrace(content: string, openingBraceIndex: number): number | null {
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inTemplateQuote = false;
    let escaped = false;

    for (let index = openingBraceIndex; index < content.length; index += 1) {
      const character = content[index];

      if (character === undefined) {
        continue;
      }

      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        continue;
      }

      if (character === "'" && !inDoubleQuote && !inTemplateQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (character === '"' && !inSingleQuote && !inTemplateQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (character === '`' && !inSingleQuote && !inDoubleQuote) {
        inTemplateQuote = !inTemplateQuote;
        continue;
      }

      if (inSingleQuote || inDoubleQuote || inTemplateQuote) {
        continue;
      }

      if (character === '{') {
        depth += 1;
        continue;
      }

      if (character === '}') {
        depth -= 1;

        if (depth === 0) {
          return index;
        }
      }
    }

    return null;
  }

  private lineNumberAt(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }

  private dedupeCandidates(candidates: FunctionCandidate[]): FunctionCandidate[] {
    const seen = new Set<string>();
    const deduped: FunctionCandidate[] = [];

    for (const candidate of candidates) {
      const key = `${candidate.functionName}:${String(candidate.startIndex)}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      deduped.push(candidate);
    }

    return deduped;
  }

  private isControlKeyword(name: string): boolean {
    return ['if', 'for', 'while', 'switch', 'catch'].includes(name);
  }
}
