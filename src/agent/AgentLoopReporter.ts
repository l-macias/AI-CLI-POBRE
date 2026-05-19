import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { AgentLoopReport, AgentLoopState } from './AgentTypes.js';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';

export interface AgentLoopReporterOptions {
  outputPath?: string | undefined;
  redactor?: SensitiveDataRedactor | undefined;
}

export class AgentLoopReporter {
  private readonly outputPath: string;
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: AgentLoopReporterOptions = {}) {
    this.outputPath = resolve(options.outputPath ?? '.runtime/agent-loop-report.md');
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public buildReport(state: AgentLoopState): AgentLoopReport {
    return {
      id: state.id,
      status: state.status,
      objective: state.objective,
      projectRoot: state.projectRoot,
      projectName: state.projectName,
      turns: state.turns,
      actions: state.actions,
      decisions: state.decisions,
      approvals: state.approvals,
      issues: state.issues,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      completedAt: state.completedAt,
    };
  }

  public toMarkdown(state: AgentLoopState): string {
    const report = this.buildReport(state);

    const provider = this.stringMetadata(state, 'provider');
    const providerModel = this.stringMetadata(state, 'providerModel');
    const allowRealProvider = this.booleanMetadata(state, 'allowRealProvider');
    const allowPremium = this.booleanMetadata(state, 'allowPremium');
    const premiumApproved = this.booleanMetadata(state, 'premiumApproved');
    const includeProjectMemory = this.booleanMetadata(state, 'includeProjectMemory');
    const estimatedCompletionTokens = this.numberMetadata(state, 'estimatedCompletionTokens');

    const actions = report.actions
      .map((action) => {
        return `- [${action.status}] ${action.kind}: ${action.label}${
          action.requiresApproval ? ' (approval required)' : ''
        }`;
      })
      .join('\n');

    const turns = report.turns
      .map((turn) => {
        return `- [${turn.role}] ${turn.createdAt}: ${turn.message}`;
      })
      .join('\n');

    const decisions =
      report.decisions.length > 0
        ? report.decisions
            .map((decision) => {
              return `- ${decision.actionId}: ${decision.selected ? 'selected' : 'not selected'} — ${
                decision.reason
              }`;
            })
            .join('\n')
        : '- none';

    const approvals =
      report.approvals.length > 0
        ? report.approvals
            .map((approval) => {
              return `- [${approval.status}] ${approval.scope} for ${approval.actionId}: ${approval.reason}${
                approval.decisionReason ? ` — ${approval.decisionReason}` : ''
              }`;
            })
            .join('\n')
        : '- none';

    const issues =
      report.issues.length > 0
        ? report.issues
            .map((issue) => {
              return `- [${issue.severity}] ${issue.code}: ${issue.message}`;
            })
            .join('\n')
        : '- none';

    const markdown = `# Zero Runtime Agent Loop

## Status

- ID: ${report.id}
- Status: ${report.status}
- Project: ${report.projectName}
- Root: ${report.projectRoot}
- Created: ${report.createdAt}
- Updated: ${report.updatedAt}
- Completed: ${report.completedAt ?? 'not completed'}

## Objective

${report.objective}

## Provider config

- Provider: ${provider}
- Provider model: ${providerModel}
- Allow real provider: ${this.yesNo(allowRealProvider)}
- Allow premium: ${this.yesNo(allowPremium)}
- Premium approved: ${this.yesNo(premiumApproved)}
- Include project memory: ${this.yesNo(includeProjectMemory)}
- Estimated completion tokens: ${estimatedCompletionTokens}

## Actions

${actions || '- none'}

## Decisions

${decisions}

## Approvals

${approvals}

## Turns

${turns || '- none'}

## Issues

${issues}
`;

    const redacted = this.redactor.redact(markdown);

    return typeof redacted === 'string' ? redacted : JSON.stringify(redacted, null, 2);
  }

  public async write(state: AgentLoopState): Promise<string> {
    const markdown = this.toMarkdown(state);

    await mkdir(dirname(this.outputPath), {
      recursive: true,
    });

    await writeFile(this.outputPath, markdown, 'utf8');

    return this.outputPath;
  }

  private stringMetadata(state: AgentLoopState, key: string): string {
    const value = state.metadata?.[key];

    return typeof value === 'string' && value.trim().length > 0 ? value : 'none';
  }

  private booleanMetadata(state: AgentLoopState, key: string): boolean {
    return state.metadata?.[key] === true;
  }

  private numberMetadata(state: AgentLoopState, key: string): number {
    const value = state.metadata?.[key];

    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private yesNo(value: boolean): string {
    return value ? 'yes' : 'no';
  }
}
