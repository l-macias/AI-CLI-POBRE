import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type { RealProjectTrialReport } from '../types/RealProjectTrialTypes.js';

export interface RealProjectTrialReporterOptions {
  outputPath?: string | undefined;
  redactor?: SensitiveDataRedactor | undefined;
}

export class RealProjectTrialReporter {
  private readonly outputPath: string;
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: RealProjectTrialReporterOptions = {}) {
    this.outputPath = resolve(options.outputPath ?? '.runtime/real-project-trial.md');
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public toMarkdown(report: RealProjectTrialReport): string {
    const inspection = report.inspection;
    const validation = report.validation;

    const targetRows =
      inspection?.targetFiles
        .map((file) => {
          return `| ${file.relativePath} | ${file.exists ? 'yes' : 'no'} | ${
            file.extension ?? ''
          } | ${file.bytes ?? 0} |`;
        })
        .join('\n') ?? '';

    const scriptRows = inspection
      ? Object.entries(inspection.packageInfo.scripts)
          .map(([name, command]) => {
            return `| ${name} | \`${command}\` |`;
          })
          .join('\n')
      : '';

    const validationRows =
      validation?.commands
        .map((command) => {
          return `| ${command.scriptName} | ${command.status} | ${command.exitCode ?? ''} | ${
            command.durationMs
          }ms | ${command.outputBytes} |`;
        })
        .join('\n') ?? '';

    const findings =
      validation?.findings
        .map((finding) => {
          const location =
            finding.relatedFile && finding.line && finding.column
              ? `${finding.relatedFile}:${finding.line}:${finding.column}`
              : (finding.relatedFile ?? 'unknown location');

          return `- [${finding.severity}] ${finding.source}: ${location} — ${finding.message}`;
        })
        .join('\n') ?? '';

    const issues = report.issues
      .map((issue) => {
        return `- [${issue.severity}] ${issue.code}: ${issue.message}`;
      })
      .join('\n');

    const actions = report.nextRecommendedActions
      .map((action) => {
        return `- ${action}`;
      })
      .join('\n');

    const markdown = `# Real Project Trial

## Status

- ID: ${report.id}
- Status: ${report.status}
- Project: ${report.projectName}
- Objective: ${report.objective}
- Writes allowed by user: ${String(report.allowWrites)}
- Command execution allowed by user: ${String(report.allowCommandExecution)}
- Created: ${report.createdAt}
- Updated: ${report.updatedAt}

## Inspection

- Project root: ${inspection?.projectRoot ?? 'not inspected'}
- Package name: ${inspection?.packageInfo.name ?? 'unknown'}
- Detected stack: ${inspection?.configInfo.detectedStack.join(', ') ?? 'unknown'}
- Has package.json: ${String(inspection?.configInfo.hasPackageJson ?? false)}
- Has tsconfig.json: ${String(inspection?.configInfo.hasTsconfig ?? false)}
- Has ESLint config: ${String(inspection?.configInfo.hasEslintConfig ?? false)}
- Has Next config: ${String(inspection?.configInfo.hasNextConfig ?? false)}
- Has Prisma schema: ${String(inspection?.configInfo.hasPrismaSchema ?? false)}

## Target Files

| File | Exists | Extension | Bytes |
| --- | --- | --- | --- |
${targetRows}

## Scripts

| Script | Command |
| --- | --- |
${scriptRows}

## Validation

- Status: ${validation?.status ?? 'not_run'}
- Validated at: ${validation?.validatedAt ?? 'not_run'}

| Script | Status | Exit Code | Duration | Output bytes |
| --- | --- | --- | --- | --- |
${validationRows}

## Findings

${findings || '- none'}

## Sensitive files ignored

${inspection?.ignoredSensitiveFiles.map((file) => `- ${file}`).join('\n') ?? '- none'}

## Issues

${issues || '- none'}

## Next recommended actions

${actions || '- none'}

## Notes

Phase B validates using controlled npm scripts only. No files were edited.
`;

    const redacted = this.redactor.redact(markdown);

    return typeof redacted === 'string' ? redacted : JSON.stringify(redacted, null, 2);
  }

  public async write(report: RealProjectTrialReport): Promise<string> {
    const markdown = this.toMarkdown(report);

    await mkdir(dirname(this.outputPath), {
      recursive: true,
    });

    await writeFile(this.outputPath, markdown, 'utf8');

    return this.outputPath;
  }
}
