import type {
  RealProjectTrialErrorFinding,
  RealProjectTrialValidationResult,
} from '../types/RealProjectTrialTypes.js';

const fileLineColumnPatterns = [
  /(?<file>(?:[A-Za-z]:[\\/])?[^:\n\r]+?\.(?:ts|tsx|js|jsx|mjs|cjs)):(?<line>\d+):(?<column>\d+)/g,
  /(?<file>(?:[A-Za-z]:[\\/])?[^(\n\r]+?\.(?:ts|tsx|js|jsx|mjs|cjs))\((?<line>\d+),(?<column>\d+)\)/g,
  /(?<file>(?:[A-Za-z]:[\\/])?[^:\n\r]+?\.(?:ts|tsx|js|jsx|mjs|cjs)):(?<line>\d+)/g,
];

const usefulErrorPatterns = [
  /Failed to compile/i,
  /Build failed/i,
  /Type error/i,
  /Error:/i,
  /TS\d{4}/i,
];

export class RealProjectTrialErrorCollector {
  public collect(
    results: readonly RealProjectTrialValidationResult[],
  ): RealProjectTrialErrorFinding[] {
    const findings: RealProjectTrialErrorFinding[] = [];

    for (const result of results) {
      if (result.status === 'passed' || result.status === 'skipped') {
        continue;
      }

      const output = this.normalizeOutput(`${result.stdout}\n${result.stderr}`);
      const parsedFindings = this.collectFileLocationFindings({
        output,
        source: result.scriptName,
        startingIndex: findings.length,
      });

      findings.push(...parsedFindings);

      if (parsedFindings.length > 0) {
        continue;
      }

      const usefulLine = this.extractFirstUsefulLine(output);

      findings.push({
        id: `finding-${findings.length + 1}`,
        source: result.scriptName,
        message: usefulLine,
        severity: 'error',
      });
    }

    return this.dedupeFindings(findings);
  }
  private dedupeFindings(findings: RealProjectTrialErrorFinding[]): RealProjectTrialErrorFinding[] {
    const seen = new Set<string>();
    const deduped: RealProjectTrialErrorFinding[] = [];

    for (const finding of findings) {
      const key = [
        finding.source,
        finding.relatedFile ?? '',
        finding.line ?? '',
        finding.column ?? '',
        finding.message,
      ].join('|');

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      deduped.push({
        ...finding,
        id: `finding-${deduped.length + 1}`,
      });
    }

    return deduped;
  }
  private collectFileLocationFindings(input: {
    output: string;
    source: string;
    startingIndex: number;
  }): RealProjectTrialErrorFinding[] {
    const findings: RealProjectTrialErrorFinding[] = [];

    for (const pattern of fileLineColumnPatterns) {
      pattern.lastIndex = 0;

      const matches = [...input.output.matchAll(pattern)];

      for (const match of matches) {
        const groups = match.groups;
        const relatedFile = groups?.['file']?.trim();

        if (!relatedFile) {
          continue;
        }

        findings.push({
          id: `finding-${input.startingIndex + findings.length + 1}`,
          source: input.source,
          message: this.extractNearbyMessage(input.output, match.index ?? 0),
          relatedFile,
          line: this.toNumber(groups?.['line']),
          column: this.toNumber(groups?.['column']),
          severity: 'error',
        });
      }

      if (findings.length > 0) {
        return findings;
      }
    }

    return findings;
  }

  private normalizeOutput(output: string): string {
    return (
      output
        // eslint-disable-next-line no-control-regex
        .replaceAll(/\u001b\[[0-9;]*m/g, '')
        .replaceAll('\r\n', '\n')
        .replaceAll('\r', '\n')
    );
  }

  private extractNearbyMessage(output: string, index: number): string {
    const start = Math.max(0, index - 240);
    const end = Math.min(output.length, index + 500);

    return output.slice(start, end).trim();
  }

  private extractFirstUsefulLine(output: string): string {
    const usefulLine = output
      .split('\n')
      .map((item) => item.trim())
      .find((item) => {
        return item.length > 0 && usefulErrorPatterns.some((pattern) => pattern.test(item));
      });

    if (usefulLine) {
      return usefulLine;
    }

    return (
      output
        .split('\n')
        .map((item) => item.trim())
        .find((item) => item.length > 0 && !item.startsWith('>')) ??
      'Validation failed without a parseable error message.'
    );
  }

  private toNumber(value: string | undefined): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
