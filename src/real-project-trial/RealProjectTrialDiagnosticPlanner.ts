import type {
  RealProjectTrialErrorFinding,
  RealProjectTrialSafetyIssue,
} from '../types/RealProjectTrialTypes.js';

export interface RealProjectTrialDiagnosticInput {
  targetFile: string;
  content: string;
  findings: RealProjectTrialErrorFinding[];
}

export interface RealProjectTrialDiagnosticResult {
  diagnosis: string[];
  proposedContent: string;
  issues: RealProjectTrialSafetyIssue[];
}

interface TypeScriptFindingInfo {
  code: string | null;
  line: number | null;
  column: number | null;
  message: string;
}

export class RealProjectTrialDiagnosticPlanner {
  public diagnose(input: RealProjectTrialDiagnosticInput): RealProjectTrialDiagnosticResult {
    const issues: RealProjectTrialSafetyIssue[] = [];
    const diagnosis: string[] = [];
    let proposedContent = input.content;

    const parsedFindings = input.findings.map((finding) => this.parseFinding(finding));

    for (const finding of parsedFindings) {
      diagnosis.push(this.describeFinding(finding));
    }

    const safeFixResult = this.trySafeLocalizedFix({
      content: input.content,
      findings: parsedFindings,
    });

    if (safeFixResult.changed) {
      proposedContent = safeFixResult.content;
    } else {
      issues.push({
        code: 'REAL_PROJECT_TRIAL_NO_SAFE_AUTOFIX',
        message:
          'No deterministic safe autofix was produced. The runtime should request manual review or use a model-generated patch with diff confirmation.',
        severity: 'warning',
      });
    }

    return {
      diagnosis,
      proposedContent,
      issues,
    };
  }

  private parseFinding(finding: RealProjectTrialErrorFinding): TypeScriptFindingInfo {
    const codeMatch = finding.message.match(/\b(TS\d{4})\b/);

    return {
      code: codeMatch?.[1] ?? null,
      line: finding.line ?? null,
      column: finding.column ?? null,
      message: finding.message,
    };
  }

  private describeFinding(finding: TypeScriptFindingInfo): string {
    if (finding.code === 'TS1136') {
      return `TS1136${this.formatLocation(
        finding,
      )}: sintaxis inválida. TypeScript esperaba una asignación de propiedad, normalmente dentro de un objeto, array, export/import o JSX mal cerrado.`;
    }

    if (finding.code === 'TS1382') {
      return `TS1382${this.formatLocation(
        finding,
      )}: token JSX inesperado. Suele ocurrir por un símbolo ">" escrito como texto dentro de JSX o por una etiqueta mal cerrada.`;
    }

    if (finding.code === 'TS1005') {
      return `TS1005${this.formatLocation(
        finding,
      )}: falta un token esperado. Revisar paréntesis, llaves, comas, tags JSX o cierre de expresión cerca de la ubicación reportada.`;
    }

    if (finding.code === 'TS2304') {
      return `TS2304${this.formatLocation(
        finding,
      )}: nombre no encontrado. Puede faltar un import, una variable o una declaración.`;
    }

    if (finding.code === 'TS2322') {
      return `TS2322${this.formatLocation(
        finding,
      )}: incompatibilidad de tipos. El valor asignado no coincide con el tipo esperado.`;
    }

    return `TypeScript${this.formatLocation(
      finding,
    )}: error detectado. Revisar mensaje original y contexto cercano.`;
  }

  private formatLocation(finding: TypeScriptFindingInfo): string {
    if (finding.line !== null && finding.column !== null) {
      return ` en línea ${String(finding.line)}, columna ${String(finding.column)}`;
    }

    if (finding.line !== null) {
      return ` en línea ${String(finding.line)}`;
    }

    return '';
  }

  private trySafeLocalizedFix(input: { content: string; findings: TypeScriptFindingInfo[] }): {
    changed: boolean;
    content: string;
  } {
    const lines = input.content.split('\n');
    let changed = false;

    for (const finding of input.findings) {
      if (finding.code !== 'TS1382' || finding.line === null) {
        continue;
      }

      const index = finding.line - 1;
      const currentLine = lines[index];

      if (typeof currentLine === 'undefined') {
        continue;
      }

      const fixedLine = this.escapeStandaloneGreaterThanText(currentLine);

      if (fixedLine !== currentLine) {
        lines[index] = fixedLine;
        changed = true;
      }
    }

    return {
      changed,
      content: changed ? lines.join('\n') : input.content,
    };
  }

  private escapeStandaloneGreaterThanText(line: string): string {
    const trimmed = line.trim();

    if (trimmed === '>') {
      return line.replace('>', '&gt;');
    }

    if (trimmed.includes('=>')) {
      return line;
    }

    if (this.looksLikeJsxTagLine(trimmed)) {
      return line;
    }

    return line;
  }

  private looksLikeJsxTagLine(trimmedLine: string): boolean {
    if (trimmedLine.startsWith('<') || trimmedLine.startsWith('</')) {
      return true;
    }

    if (trimmedLine.endsWith('/>')) {
      return true;
    }

    return /^<[A-Za-z][\s\S]*>$/.test(trimmedLine);
  }
}
