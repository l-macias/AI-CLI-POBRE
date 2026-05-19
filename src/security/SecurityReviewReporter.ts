import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type {
  SecurityFinding,
  SecurityReviewReport,
  SecurityReviewStatus,
  SecurityReviewSummary,
} from './SecurityReviewTypes.js';

export interface SecurityReviewReporterOptions {
  outputPath?: string | undefined;
  redactor?: SensitiveDataRedactor | undefined;
}

export interface SecurityReviewReporterInput {
  projectName: string;
  findings: SecurityFinding[];
  metadata?: SecurityReviewReport['metadata'] | undefined;
}

export class SecurityReviewReporter {
  private readonly outputPath: string;
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: SecurityReviewReporterOptions = {}) {
    this.outputPath = resolve(options.outputPath ?? '.runtime/security-review-report.json');
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public build(input: SecurityReviewReporterInput): SecurityReviewReport {
    const checkedAt = new Date().toISOString();
    const findings = input.findings.map((finding) => {
      return this.redactFinding(finding);
    });

    const report: SecurityReviewReport = {
      version: 1,
      projectName: input.projectName,
      summary: this.summarize({
        checkedAt,
        findings,
      }),
      findings,
    };

    const metadata = this.redactor.redactObject(input.metadata ?? {});

    if (Object.keys(metadata).length > 0) {
      report.metadata = metadata;
    }

    return report;
  }

  public async write(input: SecurityReviewReporterInput): Promise<{
    outputPath: string;
    report: SecurityReviewReport;
  }> {
    const report = this.build(input);
    const redactedReport = this.redactor.redactObject(report);

    await mkdir(dirname(this.outputPath), {
      recursive: true,
    });

    await writeFile(this.outputPath, `${JSON.stringify(redactedReport, null, 2)}\n`, 'utf8');

    return {
      outputPath: this.outputPath,
      report,
    };
  }

  private summarize(input: {
    checkedAt: string;
    findings: readonly SecurityFinding[];
  }): SecurityReviewSummary {
    const criticalFindings = input.findings.filter((finding) => {
      return finding.severity === 'critical';
    }).length;

    const errorFindings = input.findings.filter((finding) => {
      return finding.severity === 'error';
    }).length;

    const warningFindings = input.findings.filter((finding) => {
      return finding.severity === 'warning';
    }).length;

    const infoFindings = input.findings.filter((finding) => {
      return finding.severity === 'info';
    }).length;

    return {
      status: this.resolveStatus({
        criticalFindings,
        errorFindings,
        warningFindings,
      }),
      checkedAt: input.checkedAt,
      totalFindings: input.findings.length,
      criticalFindings,
      errorFindings,
      warningFindings,
      infoFindings,
    };
  }

  private resolveStatus(input: {
    criticalFindings: number;
    errorFindings: number;
    warningFindings: number;
  }): SecurityReviewStatus {
    if (input.criticalFindings > 0 || input.errorFindings > 0) {
      return 'failed';
    }

    if (input.warningFindings > 0) {
      return 'warning';
    }

    return 'passed';
  }

  private redactFinding(finding: SecurityFinding): SecurityFinding {
    const redactedEvidence =
      finding.evidence === undefined ? undefined : this.redactor.redact(finding.evidence);

    const redactedMetadata =
      finding.metadata === undefined ? undefined : this.redactor.redactObject(finding.metadata);

    const output: SecurityFinding = {
      id: finding.id,
      code: finding.code,
      category: finding.category,
      severity: finding.severity,
      message: this.redactString(finding.message),
      recommendation: this.redactString(finding.recommendation),
    };

    if (finding.location) {
      output.location = finding.location;
    }

    if (typeof redactedEvidence === 'string') {
      output.evidence = redactedEvidence;
    }

    if (redactedMetadata && Object.keys(redactedMetadata).length > 0) {
      output.metadata = redactedMetadata;
    }

    return output;
  }

  private redactString(value: string): string {
    const redacted = this.redactor.redact(value);

    return typeof redacted === 'string' ? redacted : '[REDACTED]';
  }
}
