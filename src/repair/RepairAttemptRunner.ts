import { RealProjectTrialDiffPlanner } from '../real-project-trial/RealProjectTrialDiffPlanner.js';
import type { RealProjectTrialErrorFinding } from '../types/RealProjectTrialTypes.js';
import type {
  PatchProposal,
  RepairAttemptGitBoundary,
  RepairAttemptResult,
  RepairAttemptStep,
  RepairDiffPreviewResult,
} from '../types/RepairTypes.js';
import { PatchSafetyValidator } from './PatchSafetyValidator.js';
import type { RepairProposalProvider } from './RepairProposalProvider.js';
import { RepairAttemptReporter } from './RepairAttemptReporter.js';
import { RepairContextBuilder } from './RepairContextBuilder.js';
import { RepairPromptBuilder } from './RepairPromptBuilder.js';
import { RepairRequestBuilder } from './RepairRequestBuilder.js';
import { RepairMemoryContextBuilder } from './RepairMemoryContextBuilder.js';
import type { RuntimeContextSource } from '../types/ContextTypes.js';

export interface RepairAttemptRunnerInput {
  objective: string;
  projectRoot: string;
  targetFiles: string[];
  findings: RealProjectTrialErrorFinding[];
  gitBoundary?: RepairAttemptGitBoundary | undefined;
  memoryContextSources?: RuntimeContextSource[] | undefined;
}

export interface RepairAttemptRunnerOptions {
  proposalProvider: RepairProposalProvider;
  contextBuilder?: RepairContextBuilder | undefined;
  requestBuilder?: RepairRequestBuilder | undefined;
  promptBuilder?: RepairPromptBuilder | undefined;
  memoryContextBuilder?: RepairMemoryContextBuilder | undefined;
  patchValidator?: PatchSafetyValidator | undefined;
  diffPlanner?: RealProjectTrialDiffPlanner | undefined;
  reporter?: RepairAttemptReporter | undefined;
}

export class RepairAttemptRunner {
  private readonly proposalProvider: RepairProposalProvider;
  private readonly contextBuilder: RepairContextBuilder;
  private readonly requestBuilder: RepairRequestBuilder;
  private readonly promptBuilder: RepairPromptBuilder;
  private readonly memoryContextBuilder: RepairMemoryContextBuilder;
  private readonly patchValidator: PatchSafetyValidator;
  private readonly diffPlanner: RealProjectTrialDiffPlanner;
  private readonly reporter: RepairAttemptReporter;

  public constructor(options: RepairAttemptRunnerOptions) {
    this.proposalProvider = options.proposalProvider;
    this.contextBuilder = options.contextBuilder ?? new RepairContextBuilder();
    this.requestBuilder = options.requestBuilder ?? new RepairRequestBuilder();
    this.promptBuilder = options.promptBuilder ?? new RepairPromptBuilder();
    this.memoryContextBuilder = options.memoryContextBuilder ?? new RepairMemoryContextBuilder();
    this.patchValidator = options.patchValidator ?? new PatchSafetyValidator();
    this.diffPlanner = options.diffPlanner ?? new RealProjectTrialDiffPlanner();
    this.reporter = options.reporter ?? new RepairAttemptReporter();
  }

  public async run(input: RepairAttemptRunnerInput): Promise<RepairAttemptResult> {
    const createdAt = new Date().toISOString();
    const steps: RepairAttemptStep[] = [];
    const blockers: string[] = [];
    const failures: string[] = [];

    const attemptId = `repair-attempt-${createdAt.replaceAll(':', '').replaceAll('.', '')}`;

    try {
      const targetFiles = await this.contextBuilder.build({
        projectRoot: input.projectRoot,
        targetFiles: input.targetFiles,
        findings: input.findings,
      });

      steps.push(this.step('context_built', 'executed', 'Repair context built from target files.'));

      const request = this.requestBuilder.build({
        objective: input.objective,
        projectRoot: input.projectRoot,
        findings: input.findings,
        targetFiles,
      });

      steps.push(this.step('request_built', 'executed', 'Repair request built.'));

      const prompt = this.buildPromptWithMemory({
        requestPrompt: this.promptBuilder.build(request),
        memoryContextSources: input.memoryContextSources,
      });

      steps.push(
        this.step(
          'prompt_built',
          'executed',
          input.memoryContextSources && input.memoryContextSources.length > 0
            ? 'Repair prompt built with project memory context.'
            : 'Repair prompt built.',
        ),
      );

      const proposalResult = await this.proposalProvider.propose({
        request,
        prompt,
      });

      steps.push(this.step('proposal_received', 'executed', 'Patch proposal received.'));

      const patchValidation = this.patchValidator.validate({
        request,
        proposal: proposalResult.proposal,
      });

      if (!patchValidation.valid) {
        blockers.push('Patch proposal failed safety validation.');

        steps.push(this.step('patch_validation', 'blocked', 'Patch proposal blocked.'));

        const result: RepairAttemptResult = {
          id: attemptId,
          status: 'proposal_invalid',
          objective: input.objective,
          projectRoot: input.projectRoot,
          request,
          prompt,
          proposal: proposalResult.proposal,
          patchValidation,
          diffPreviews: [],
          steps,
          blockers,
          failures,
          modelUsage: proposalResult.modelUsage,
          modelPolicyDecision: proposalResult.modelPolicyDecision,
          providerFallbackUsed: proposalResult.providerFallbackUsed,
          providerFallbackReason: proposalResult.providerFallbackReason,
          gitBoundary: input.gitBoundary,
          createdAt,
          completedAt: new Date().toISOString(),
        };

        await this.reporter.write(result);

        return result;
      }

      steps.push(
        this.step('patch_validation', 'executed', 'Patch proposal passed safety validation.'),
      );

      const diffPreviews = await this.createDiffPreviews({
        projectRoot: input.projectRoot,
        proposal: proposalResult.proposal,
      });

      steps.push(this.step('diff_preview', 'executed', 'Diff preview generated.'));

      const result: RepairAttemptResult = {
        id: attemptId,
        status: 'diff_ready',
        objective: input.objective,
        projectRoot: input.projectRoot,
        request,
        prompt,
        proposal: proposalResult.proposal,
        patchValidation,
        diffPreviews,
        steps,
        blockers,
        failures,
        modelUsage: proposalResult.modelUsage,
        modelPolicyDecision: proposalResult.modelPolicyDecision,
        providerFallbackUsed: proposalResult.providerFallbackUsed,
        providerFallbackReason: proposalResult.providerFallbackReason,
        gitBoundary: input.gitBoundary,
        createdAt,
        completedAt: new Date().toISOString(),
      };

      await this.reporter.write(result);

      return result;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));

      const emptyRequest = this.requestBuilder.build({
        objective: input.objective,
        projectRoot: input.projectRoot,
        findings: input.findings,
        targetFiles: [],
      });

      const result: RepairAttemptResult = {
        id: attemptId,
        status: 'failed',
        objective: input.objective,
        projectRoot: input.projectRoot,
        request: emptyRequest,
        prompt: '',
        patchValidation: {
          valid: false,
          issues: [
            {
              code: 'REPAIR_ATTEMPT_FAILED',
              message: failures.join('; '),
              severity: 'error',
            },
          ],
        },
        diffPreviews: [],
        steps,
        blockers,
        failures,
        gitBoundary: input.gitBoundary,
        createdAt,
        completedAt: new Date().toISOString(),
      };

      await this.reporter.write(result);

      return result;
    }
  }
  private buildPromptWithMemory(input: {
    requestPrompt: string;
    memoryContextSources?: RuntimeContextSource[] | undefined;
  }): string {
    const memoryContext = this.memoryContextBuilder.build({
      sources: input.memoryContextSources ?? [],
    });

    if (!memoryContext.trim()) {
      return input.requestPrompt;
    }

    return `${input.requestPrompt}

---

${memoryContext}`;
  }
  private async createDiffPreviews(input: {
    projectRoot: string;
    proposal: PatchProposal;
  }): Promise<RepairDiffPreviewResult[]> {
    const previews: RepairDiffPreviewResult[] = [];

    for (const operation of input.proposal.operations) {
      if (
        (operation.kind !== 'replace_file' && operation.kind !== 'edit_file') ||
        typeof operation.newContent !== 'string'
      ) {
        continue;
      }

      const plan = await this.diffPlanner.plan({
        projectRoot: input.projectRoot,
        targetFile: operation.targetFile,
        proposedContent: operation.newContent,
      });

      previews.push({
        targetFile: operation.targetFile,
        changed: plan.preview.changed,
        changedLines: plan.preview.diff.filter((line) => line.type !== 'same').length,
        markdown: this.diffPlanner.toMarkdown(plan),
      });
    }

    return previews;
  }

  private step(
    id: string,
    status: RepairAttemptStep['status'],
    description: string,
  ): RepairAttemptStep {
    return {
      id,
      status,
      description,
      timestamp: new Date().toISOString(),
    };
  }
}
