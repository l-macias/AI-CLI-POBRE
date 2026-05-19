import type { CliRunResult } from './CliTypes.js';

interface ProjectCommandOutputLike {
  action?: string;
  config?: {
    currentProjectId?: string | null;
    projects?: {
      id?: string;
      name?: string;
      rootPath?: string;
    }[];
  };
  project?: {
    id?: string;
    name?: string;
    rootPath?: string;
  } | null;
}

interface RuntimeBootstrapWriteLike {
  rootDir?: string;
  status?: string;
  writtenFiles?: string[];
  skippedFiles?: string[];
  issues?: IssueLike[];
}

interface IssueLike {
  code?: string;
  message?: string;
  severity?: string;
}

interface StatusLike {
  projectRoot?: string;
  runtimeExists?: boolean;
  runtimeDir?: string;
  existingFiles?: string[];
  missingFiles?: string[];
  inspectedAt?: string;
}

interface DoctorLike {
  projectRoot?: string;
  ready?: boolean;
  stack?: {
    stacks?: string[];
    packageManager?: string | null;
    hasPackageJson?: boolean;
    hasTsConfig?: boolean;
    hasSrcDirectory?: boolean;
  };
  checks?: Record<string, string>;
  issues?: IssueLike[];
}

interface RealProjectTrialReportLike {
  id?: string;
  status?: string;
  projectName?: string;
  objective?: string;
  inspection?: {
    projectRoot?: string;
    packageInfo?: {
      name?: string | null;
      scripts?: Record<string, string>;
    };
    configInfo?: {
      detectedStack?: string[];
      hasPackageJson?: boolean;
      hasTsconfig?: boolean;
      hasEslintConfig?: boolean;
      hasNextConfig?: boolean;
      hasPrismaSchema?: boolean;
    };
    targetFiles?: {
      relativePath?: string;
      exists?: boolean;
      bytes?: number;
      extension?: string;
    }[];
  };
  validation?: {
    status?: string;
    commands?: {
      scriptName?: string;
      status?: string;
      exitCode?: number;
      durationMs?: number;
      outputBytes?: number;
    }[];
    findings?: {
      source?: string;
      relatedFile?: string;
      line?: number;
      column?: number;
      message?: string;
      severity?: string;
    }[];
  } | null;
  issues?: IssueLike[];
  nextRecommendedActions?: string[];
}

interface RepairAttemptLike {
  id?: string;
  status?: string;
  objective?: string;
  projectRoot?: string;
  patchValidation?: {
    valid?: boolean;
    issues?: IssueLike[];
  };
  diffPreviews?: {
    targetFile?: string;
    changed?: boolean;
    changedLines?: number;
  }[];
  blockers?: string[];
  failures?: string[];
  modelUsage?: {
    provider?: string;
    model?: string;
    totalTokens?: number;
    estimatedUsd?: number;
  };
  modelPolicyDecision?: {
    allowed?: boolean;
    status?: string;
    provider?: string;
    selectedProvider?: string;
    selectedModel?: string;
    requiresPremiumApproval?: boolean;
    estimate?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      estimatedUsd?: number;
      pricingKnown?: boolean;
    };
    issues?: IssueLike[];
  };
  providerFallbackUsed?: boolean;
  providerFallbackReason?: string;
  gitBoundary?: {
    safeToWriteLater?: boolean;
    boundary?: {
      branch?: string;
      workingTreeState?: string;
      clean?: boolean;
      modifiedFiles?: string[];
      untrackedFiles?: string[];
      deletedFiles?: string[];
    };
    guard?: {
      decision?: string;
      allowed?: boolean;
      reason?: string;
    };
  };
}

interface GitCommandOutputLike {
  action?: string;
  text?: string;
}

interface PatchApplyOutputLike {
  id?: string;
  status?: string;
  projectRoot?: string;
  proposalId?: string;
  gitBoundary?: {
    safeToWrite?: boolean;
    guard?: {
      decision?: string;
      reason?: string;
    };
    boundary?: {
      branch?: string;
      workingTreeState?: string;
      clean?: boolean;
    };
  };
  operationResults?: {
    targetFile?: string;
    kind?: string;
    status?: string;
    message?: string;
    backup?: {
      backupPath?: string;
      existed?: boolean;
    };
  }[];
  contentChecks?: {
    targetFile?: string;
    expectedContentProvided?: boolean;
    matched?: boolean;
    message?: string;
  }[];
  issues?: IssueLike[];
}
interface AgentCommandOutputLike {
  action?: string;
  state?: AgentLoopStateOutputLike;
  text?: string;
}
interface SecurityCommandOutputLike {
  action?: string;
  projectRoot?: string;
  projectName?: string;
  reportPath?: string;
  summary?: {
    status?: string;
    checkedAt?: string;
    totalFindings?: number;
    criticalFindings?: number;
    errorFindings?: number;
    warningFindings?: number;
    infoFindings?: number;
  };
}
interface AgentLoopStateOutputLike {
  id?: string;
  status?: string;
  objective?: string;
  projectRoot?: string;
  projectName?: string;
  targetFiles?: string[];
  actions?: {
    id?: string;
    kind?: string;
    label?: string;
    status?: string;
    requiresApproval?: boolean;
  }[];
  approvals?: {
    id?: string;
    scope?: string;
    status?: string;
    actionId?: string;
    reason?: string;
    decisionReason?: string;
  }[];
  issues?: IssueLike[];
  metadata?: Record<string, unknown>;
}
interface ScaffoldCommandOutputLike {
  action?: string;
  projectRoot?: string;
  reportPath?: string;
  proposalOutputPath?: string;
  status?: string;
  failures?: unknown[];
  operations?: {
    kind?: string;
    targetFile?: string;
    reason?: string;
  }[];
  diffPreviews?: {
    targetFile?: string;
    changed?: boolean;
    changedLines?: number;
    markdown?: string;
  }[];
}

export class CliOutputFormatter {
  public format(result: CliRunResult, format: 'text' | 'json'): string {
    if (format === 'json') {
      return JSON.stringify(result, null, 2);
    }

    if (typeof result.output === 'string') {
      return result.output;
    }

    if (result.status === 'error') {
      return this.formatError(result);
    }

    if (result.command === 'init') {
      return this.formatInit(result.output);
    }

    if (result.command === 'status') {
      return this.formatStatus(result.output);
    }

    if (result.command === 'doctor') {
      return this.formatDoctor(result.output);
    }

    if (result.command === 'inspect') {
      return this.formatInspect(result.output);
    }

    if (result.command === 'validate') {
      return this.formatValidate(result.output);
    }

    if (result.command === 'repair') {
      return this.formatRepair(result.output);
    }

    if (result.command === 'project') {
      return this.formatProject(result.output);
    }

    if (result.command === 'git') {
      return this.formatGit(result.output);
    }

    if (result.command === 'patch') {
      return this.formatPatch(result.output);
    }
    if (result.command === 'agent') {
      return this.formatAgent(result.output);
    }
    if (result.command === 'security') {
      return this.formatSecurity(result.output);
    }
    if (result.command === 'scaffold') {
      return this.formatScaffold(result.output);
    }
    return JSON.stringify(result.output, null, 2);
  }

  private formatError(result: CliRunResult): string {
    const issues = result.issues.map((issue) => `- ${issue.code}: ${issue.message}`).join('\n');

    return `Zero Runtime command failed

Command: ${result.command}
Created: ${result.createdAt}

Issues:
${issues || '- unknown error'}`;
  }

  private formatInit(output: unknown): string {
    const data = output as RuntimeBootstrapWriteLike;

    return `Zero Runtime initialized

Status: ${data.status ?? 'unknown'}
Project: ${data.rootDir ?? 'unknown'}

Written files: ${data.writtenFiles?.length ?? 0}
Skipped files: ${data.skippedFiles?.length ?? 0}

Issues:
${this.formatIssues(data.issues)}`;
  }

  private formatStatus(output: unknown): string {
    const data = output as StatusLike;

    return `Zero Runtime status

Project: ${data.projectRoot ?? 'unknown'}
Runtime exists: ${this.yesNo(data.runtimeExists)}
Runtime dir: ${data.runtimeDir ?? 'unknown'}

Existing runtime files: ${data.existingFiles?.length ?? 0}
Missing runtime files: ${data.missingFiles?.length ?? 0}

Missing:
${this.formatList(data.missingFiles)}`;
  }

  private formatDoctor(output: unknown): string {
    const data = output as DoctorLike;
    const checks = Object.entries(data.checks ?? {})
      .map(([name, status]) => `- ${name}: ${status}`)
      .join('\n');

    return `Zero Runtime doctor

Project: ${data.projectRoot ?? 'unknown'}
Ready: ${this.yesNo(data.ready)}

Stack:
${this.formatList(data.stack?.stacks)}

Package manager: ${data.stack?.packageManager ?? 'unknown'}

Checks:
${checks || '- none'}

Issues:
${this.formatIssues(data.issues)}`;
  }

  private formatInspect(output: unknown): string {
    const data = output as RealProjectTrialReportLike;
    const inspection = data.inspection;
    const config = inspection?.configInfo;

    return `Zero Runtime inspect

Status: ${data.status ?? 'unknown'}
Project: ${data.projectName ?? 'unknown'}
Root: ${inspection?.projectRoot ?? 'unknown'}

Detected stack:
${this.formatList(config?.detectedStack)}

Target files:
${this.formatTargetFiles(inspection?.targetFiles)}

Scripts:
${this.formatScripts(inspection?.packageInfo?.scripts)}

Issues:
${this.formatIssues(data.issues)}

Next:
${this.formatList(data.nextRecommendedActions)}`;
  }

  private formatValidate(output: unknown): string {
    const data = output as RealProjectTrialReportLike;
    const validation = data.validation;

    return `Zero Runtime validate

Status: ${validation?.status ?? 'not_run'}
Project: ${data.projectName ?? 'unknown'}
Root: ${data.inspection?.projectRoot ?? 'unknown'}

Commands:
${this.formatValidationCommands(validation?.commands)}

Findings:
${this.formatFindings(validation?.findings)}

Issues:
${this.formatIssues(data.issues)}

Next:
${this.formatList(data.nextRecommendedActions)}`;
  }

  private formatRepair(output: unknown): string {
    const data = output as RepairAttemptLike;

    return `Zero Runtime repair

Status: ${data.status ?? 'unknown'}
Project root: ${data.projectRoot ?? 'unknown'}
Objective: ${data.objective ?? 'unknown'}

Patch valid: ${this.yesNo(data.patchValidation?.valid)}

Diff previews:
${this.formatDiffPreviews(data.diffPreviews)}

Blockers:
${this.formatList(data.blockers)}

Failures:
${this.formatList(data.failures)}

Patch issues:
${this.formatIssues(data.patchValidation?.issues)}

Git boundary:
- Branch: ${data.gitBoundary?.boundary?.branch ?? 'unknown'}
- Working tree: ${data.gitBoundary?.boundary?.workingTreeState ?? 'unknown'}
- Clean: ${this.yesNo(data.gitBoundary?.boundary?.clean)}
- Guard decision: ${data.gitBoundary?.guard?.decision ?? 'unknown'}
- Safe to write later: ${this.yesNo(data.gitBoundary?.safeToWriteLater)}
- Reason: ${data.gitBoundary?.guard?.reason ?? 'unknown'}

Modified files:
${this.formatList(data.gitBoundary?.boundary?.modifiedFiles)}

Untracked files:
${this.formatList(data.gitBoundary?.boundary?.untrackedFiles)}

Deleted files:
${this.formatList(data.gitBoundary?.boundary?.deletedFiles)}

Model:
- Provider: ${data.modelUsage?.provider ?? 'none'}
- Model: ${data.modelUsage?.model ?? 'none'}
- Tokens: ${data.modelUsage?.totalTokens ?? 0}
- Estimated USD: ${data.modelUsage?.estimatedUsd ?? 0}

Model policy:
- Allowed: ${this.yesNo(data.modelPolicyDecision?.allowed)}
- Status: ${data.modelPolicyDecision?.status ?? 'none'}
- Provider requested: ${data.modelPolicyDecision?.provider ?? 'none'}
- Selected provider: ${data.modelPolicyDecision?.selectedProvider ?? 'none'}
- Selected model: ${data.modelPolicyDecision?.selectedModel ?? 'none'}
- Requires premium approval: ${this.yesNo(data.modelPolicyDecision?.requiresPremiumApproval)}
- Fallback used: ${this.yesNo(data.providerFallbackUsed)}
- Fallback reason: ${data.providerFallbackReason ?? 'none'}

Model policy estimate:
- Prompt tokens: ${data.modelPolicyDecision?.estimate?.promptTokens ?? 0}
- Completion tokens: ${data.modelPolicyDecision?.estimate?.completionTokens ?? 0}
- Total tokens: ${data.modelPolicyDecision?.estimate?.totalTokens ?? 0}
- Estimated USD: ${data.modelPolicyDecision?.estimate?.estimatedUsd ?? 0}
- Pricing known: ${this.yesNo(data.modelPolicyDecision?.estimate?.pricingKnown)}

Model policy issues:
${this.formatIssues(data.modelPolicyDecision?.issues)}`;
  }

  private formatProject(output: unknown): string {
    const data = output as ProjectCommandOutputLike;
    const projects = data.config?.projects ?? [];

    if (data.action === 'current') {
      if (!data.project) {
        return `Zero Runtime project

Current project: none`;
      }

      return `Zero Runtime project

Current project:
- ${data.project.name ?? 'unknown'} (${data.project.id ?? 'unknown'})
  ${data.project.rootPath ?? 'unknown'}`;
    }

    return `Zero Runtime project

Action: ${data.action ?? 'unknown'}
Current project id: ${data.config?.currentProjectId ?? 'none'}

Projects:
${this.formatWorkspaceProjects(projects)}`;
  }

  private formatGit(output: unknown): string {
    const data = output as GitCommandOutputLike;

    return data.text ?? `Git ${data.action ?? 'unknown'} output unavailable.`;
  }

  private formatPatch(output: unknown): string {
    const data = output as PatchApplyOutputLike;

    return `Zero Runtime patch apply

Status: ${data.status ?? 'unknown'}
Project root: ${data.projectRoot ?? 'unknown'}
Proposal: ${data.proposalId ?? 'unknown'}

Git:
- Branch: ${data.gitBoundary?.boundary?.branch ?? 'unknown'}
- Working tree: ${data.gitBoundary?.boundary?.workingTreeState ?? 'unknown'}
- Clean: ${this.yesNo(data.gitBoundary?.boundary?.clean)}
- Guard decision: ${data.gitBoundary?.guard?.decision ?? 'unknown'}
- Safe to write: ${this.yesNo(data.gitBoundary?.safeToWrite)}
- Reason: ${data.gitBoundary?.guard?.reason ?? 'unknown'}

Content checks:
${this.formatPatchContentChecks(data.contentChecks)}

Operations:
${this.formatPatchOperations(data.operationResults)}

Issues:
${this.formatIssues(data.issues)}`;
  }

  private formatAgent(output: unknown): string {
    const data = output as AgentCommandOutputLike;
    const state = data.state;

    if (data.text) {
      return data.text;
    }

    return `Zero Runtime agent

Action: ${data.action ?? 'unknown'}
Status: ${state?.status ?? 'unknown'}
Loop: ${state?.id ?? 'unknown'}
Project: ${state?.projectName ?? 'unknown'}
Root: ${state?.projectRoot ?? 'unknown'}
Objective: ${state?.objective ?? 'unknown'}

Provider:
- Provider: ${this.stringFromRecord(state?.metadata, 'provider')}
- Model: ${this.stringFromRecord(state?.metadata, 'providerModel')}
- Real provider enabled: ${this.yesNo(this.booleanFromRecord(state?.metadata, 'allowRealProvider'))}
- Premium allowed: ${this.yesNo(this.booleanFromRecord(state?.metadata, 'allowPremium'))}
- Premium approved: ${this.yesNo(this.booleanFromRecord(state?.metadata, 'premiumApproved'))}
- Project memory: ${this.yesNo(this.booleanFromRecord(state?.metadata, 'includeProjectMemory'))}
- Estimated completion tokens: ${this.numberFromRecord(state?.metadata, 'estimatedCompletionTokens')}

Target files:
${this.formatList(state?.targetFiles)}

Actions:
${this.formatAgentActions(state?.actions)}

Approvals:
${this.formatAgentApprovals(state?.approvals)}

Issues:
${this.formatIssues(state?.issues)}`;
  }

  private formatSecurity(output: unknown): string {
    const data = output as SecurityCommandOutputLike;

    return `Zero Runtime security review

Action: ${data.action ?? 'unknown'}
Project: ${data.projectName ?? 'unknown'}
Root: ${data.projectRoot ?? 'unknown'}
Report: ${data.reportPath ?? 'unknown'}

Summary:
- Status: ${data.summary?.status ?? 'unknown'}
- Checked at: ${data.summary?.checkedAt ?? 'unknown'}
- Total findings: ${data.summary?.totalFindings ?? 0}
- Critical: ${data.summary?.criticalFindings ?? 0}
- Errors: ${data.summary?.errorFindings ?? 0}
- Warnings: ${data.summary?.warningFindings ?? 0}
- Info: ${data.summary?.infoFindings ?? 0}`;
  }
  private formatTargetFiles(
    files:
      | {
          relativePath?: string;
          exists?: boolean;
          bytes?: number;
          extension?: string;
        }[]
      | undefined,
  ): string {
    if (!files || files.length === 0) {
      return '- none';
    }

    return files
      .map((file) => {
        return `- ${file.relativePath ?? 'unknown'}: ${
          file.exists ? 'exists' : 'missing'
        } (${file.bytes ?? 0} bytes)`;
      })
      .join('\n');
  }

  private formatScripts(scripts: Record<string, string> | undefined): string {
    const entries = Object.entries(scripts ?? {});

    if (entries.length === 0) {
      return '- none';
    }

    return entries.map(([name, command]) => `- ${name}: ${command}`).join('\n');
  }

  private formatValidationCommands(
    commands:
      | {
          scriptName?: string;
          status?: string;
          exitCode?: number;
          durationMs?: number;
          outputBytes?: number;
        }[]
      | undefined,
  ): string {
    if (!commands || commands.length === 0) {
      return '- none';
    }

    return commands
      .map((command) => {
        return `- ${command.scriptName ?? 'unknown'}: ${command.status ?? 'unknown'} (${
          command.durationMs ?? 0
        }ms, exit ${command.exitCode ?? 'n/a'})`;
      })
      .join('\n');
  }

  private formatFindings(
    findings:
      | {
          source?: string;
          relatedFile?: string;
          line?: number;
          column?: number;
          message?: string;
          severity?: string;
        }[]
      | undefined,
  ): string {
    if (!findings || findings.length === 0) {
      return '- none';
    }

    return findings
      .map((finding) => {
        const location = finding.relatedFile
          ? `${finding.relatedFile}:${finding.line ?? '?'}:${finding.column ?? '?'}`
          : 'unknown location';

        return `- [${finding.severity ?? 'unknown'}] ${finding.source ?? 'unknown'}: ${location}
  ${finding.message ?? 'No message'}`;
      })
      .join('\n');
  }

  private formatDiffPreviews(
    previews:
      | {
          targetFile?: string;
          changed?: boolean;
          changedLines?: number;
        }[]
      | undefined,
  ): string {
    if (!previews || previews.length === 0) {
      return '- none';
    }

    return previews
      .map((preview) => {
        return `- ${preview.targetFile ?? 'unknown'}: ${
          preview.changed ? 'changed' : 'unchanged'
        } (${preview.changedLines ?? 0} changed lines)`;
      })
      .join('\n');
  }

  private formatIssues(issues: IssueLike[] | undefined): string {
    if (!issues || issues.length === 0) {
      return '- none';
    }

    return issues
      .map((issue) => {
        return `- [${issue.severity ?? 'unknown'}] ${issue.code ?? 'UNKNOWN'}: ${
          issue.message ?? 'No message'
        }`;
      })
      .join('\n');
  }

  private formatList(items: readonly string[] | undefined): string {
    if (!items || items.length === 0) {
      return '- none';
    }

    return items.map((item) => `- ${item}`).join('\n');
  }

  private formatWorkspaceProjects(
    projects:
      | {
          id?: string;
          name?: string;
          rootPath?: string;
        }[]
      | undefined,
  ): string {
    if (!projects || projects.length === 0) {
      return '- none';
    }

    return projects
      .map((project) => {
        return `- ${project.name ?? 'unknown'} (${project.id ?? 'unknown'})
  ${project.rootPath ?? 'unknown'}`;
      })
      .join('\n');
  }

  private formatPatchContentChecks(
    checks:
      | {
          targetFile?: string;
          expectedContentProvided?: boolean;
          matched?: boolean;
          message?: string;
        }[]
      | undefined,
  ): string {
    if (!checks || checks.length === 0) {
      return '- none';
    }

    return checks
      .map((check) => {
        return `- ${check.targetFile ?? 'unknown'}: ${
          check.matched ? 'matched' : 'mismatch'
        } — ${check.message ?? 'No message'}`;
      })
      .join('\n');
  }

  private formatPatchOperations(
    operations:
      | {
          targetFile?: string;
          kind?: string;
          status?: string;
          message?: string;
          backup?: {
            backupPath?: string;
            existed?: boolean;
          };
        }[]
      | undefined,
  ): string {
    if (!operations || operations.length === 0) {
      return '- none';
    }

    return operations
      .map((operation) => {
        return `- ${operation.kind ?? 'unknown'} ${operation.targetFile ?? 'unknown'}: ${
          operation.status ?? 'unknown'
        }
  ${operation.message ?? 'No message'}
  Backup: ${operation.backup?.backupPath ?? 'none'}`;
      })
      .join('\n');
  }
  private formatAgentActions(
    actions:
      | {
          id?: string;
          kind?: string;
          label?: string;
          status?: string;
          requiresApproval?: boolean;
        }[]
      | undefined,
  ): string {
    if (!actions || actions.length === 0) {
      return '- none';
    }

    return actions
      .map((action) => {
        return `- [${action.status ?? 'unknown'}] ${action.kind ?? 'unknown'} (${action.id ?? 'unknown'})${
          action.requiresApproval ? ' — approval required' : ''
        }`;
      })
      .join('\n');
  }

  private formatAgentApprovals(
    approvals:
      | {
          id?: string;
          scope?: string;
          status?: string;
          actionId?: string;
          reason?: string;
          decisionReason?: string;
        }[]
      | undefined,
  ): string {
    if (!approvals || approvals.length === 0) {
      return '- none';
    }

    return approvals
      .map((approval) => {
        return `- [${approval.status ?? 'unknown'}] ${approval.scope ?? 'unknown'} (${approval.id ?? 'unknown'})
  Action: ${approval.actionId ?? 'unknown'}
  Reason: ${approval.reason ?? 'unknown'}
  Decision: ${approval.decisionReason ?? 'none'}`;
      })
      .join('\n');
  }
  private stringFromRecord(record: Record<string, unknown> | undefined, key: string): string {
    const value = record?.[key];

    return typeof value === 'string' && value.trim().length > 0 ? value : 'none';
  }

  private booleanFromRecord(record: Record<string, unknown> | undefined, key: string): boolean {
    return record?.[key] === true;
  }

  private numberFromRecord(record: Record<string, unknown> | undefined, key: string): number {
    const value = record?.[key];

    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
  private formatScaffold(output: unknown): string {
    const data = output as ScaffoldCommandOutputLike;
    const operations = data.operations ?? [];
    const previews = data.diffPreviews ?? [];
    const failures = data.failures ?? [];

    return `Zero Runtime scaffold

Action: ${data.action ?? 'unknown'}
Status: ${data.status ?? 'unknown'}
Root: ${data.projectRoot ?? 'unknown'}
Report: ${data.reportPath ?? 'unknown'}
Patch proposal: ${data.proposalOutputPath ?? 'not saved'}

Operations:
${this.formatScaffoldOperations(operations)}

Diff previews:
${this.formatScaffoldDiffPreviews(previews)}

Failures:
${this.formatUnknownList(failures)}`;
  }

  private formatScaffoldOperations(
    operations: readonly {
      kind?: string;
      targetFile?: string;
      reason?: string;
    }[],
  ): string {
    if (operations.length === 0) {
      return '- none';
    }

    return operations
      .map((operation) => {
        return `- ${operation.kind ?? 'unknown'} ${operation.targetFile ?? 'unknown'} — ${
          operation.reason ?? 'no reason'
        }`;
      })
      .join('\n');
  }

  private formatScaffoldDiffPreviews(
    previews: readonly {
      targetFile?: string;
      changed?: boolean;
      changedLines?: number;
      markdown?: string;
    }[],
  ): string {
    if (previews.length === 0) {
      return '- none';
    }

    return previews
      .map((preview) => {
        return [
          `- ${preview.targetFile ?? 'unknown'}: ${
            preview.changed === true ? 'changed' : 'unchanged'
          } (${String(preview.changedLines ?? 0)} lines)`,
          preview.markdown ?? '',
        ].join('\n');
      })
      .join('\n\n');
  }

  private formatUnknownList(values: readonly unknown[]): string {
    if (values.length === 0) {
      return '- none';
    }

    return values.map((value) => `- ${String(value)}`).join('\n');
  }
  private yesNo(value: boolean | undefined): string {
    if (value === true) {
      return 'yes';
    }

    if (value === false) {
      return 'no';
    }

    return 'unknown';
  }
}
