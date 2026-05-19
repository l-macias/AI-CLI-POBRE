import type { PatchProposal, RepairDiffPreviewResult } from '../types/RepairTypes.js';
import { FakeModuleGeneratorProvider } from './ModuleGeneratorProvider.js';
import type { ModuleGeneratorProvider } from './ModuleGeneratorProvider.js';
import { ScaffoldDiffBuilder } from './ScaffoldDiffBuilder.js';
import { ScaffoldIntentParser } from './ScaffoldIntentParser.js';
import { ScaffoldPatchBridge } from './ScaffoldPatchBridge.js';
import { ScaffoldProjectConventionReader } from './ScaffoldProjectConventionReader.js';
import { ScaffoldProposalParser } from './ScaffoldProposalParser.js';
import { ScaffoldReporter } from './ScaffoldReporter.js';
import { ScaffoldRequestBuilder } from './ScaffoldRequestBuilder.js';
import { ScaffoldSafetyValidator } from './ScaffoldSafetyValidator.js';
import type {
  ScaffoldIntentInput,
  ScaffoldProposal,
  ScaffoldProposalValidationResult,
  ScaffoldRequest,
  ScaffoldRunResult,
  ScaffoldRunStep,
  ScaffoldSafetyValidationSummary,
} from './ScaffoldTypes.js';

export interface ScaffoldRunnerOptions {
  intentParser?: ScaffoldIntentParser | undefined;
  conventionReader?: ScaffoldProjectConventionReader | undefined;
  requestBuilder?: ScaffoldRequestBuilder | undefined;
  provider?: ModuleGeneratorProvider | undefined;
  proposalParser?: ScaffoldProposalParser | undefined;
  safetyValidator?: ScaffoldSafetyValidator | undefined;
  patchBridge?: ScaffoldPatchBridge | undefined;
  diffBuilder?: ScaffoldDiffBuilder | undefined;
  reporter?: ScaffoldReporter | undefined;
}

export interface ScaffoldRunnerInput {
  projectRoot: string;
  objective?: string | undefined;
  intent: Partial<ScaffoldIntentInput>;
}

export class ScaffoldRunner {
  private readonly intentParser: ScaffoldIntentParser;
  private readonly conventionReader: ScaffoldProjectConventionReader;
  private readonly requestBuilder: ScaffoldRequestBuilder;
  private readonly provider: ModuleGeneratorProvider;
  private readonly proposalParser: ScaffoldProposalParser;
  private readonly safetyValidator: ScaffoldSafetyValidator;
  private readonly patchBridge: ScaffoldPatchBridge;
  private readonly diffBuilder: ScaffoldDiffBuilder;
  private readonly reporter: ScaffoldReporter;

  public constructor(options: ScaffoldRunnerOptions = {}) {
    this.intentParser = options.intentParser ?? new ScaffoldIntentParser();
    this.conventionReader = options.conventionReader ?? new ScaffoldProjectConventionReader();
    this.requestBuilder = options.requestBuilder ?? new ScaffoldRequestBuilder();
    this.provider = options.provider ?? new FakeModuleGeneratorProvider();
    this.proposalParser = options.proposalParser ?? new ScaffoldProposalParser();
    this.safetyValidator = options.safetyValidator ?? new ScaffoldSafetyValidator();
    this.patchBridge = options.patchBridge ?? new ScaffoldPatchBridge();
    this.diffBuilder = options.diffBuilder ?? new ScaffoldDiffBuilder();
    this.reporter = options.reporter ?? new ScaffoldReporter();
  }

  public async run(input: ScaffoldRunnerInput): Promise<ScaffoldRunResult> {
    const createdAt = new Date().toISOString();
    const id = `scaffold-run-${createdAt.replaceAll(':', '').replaceAll('.', '')}`;
    const steps: ScaffoldRunStep[] = [];
    const failures: string[] = [];

    const parsedIntent = this.intentParser.parse(input.intent);

    if (!parsedIntent.ok) {
      const result = this.buildResult({
        id,
        status: 'intent_invalid',
        projectRoot: input.projectRoot,
        proposalValidation: this.emptyValidation(),
        safety: this.emptySafety(),
        steps: [
          ...steps,
          this.step({
            id: 'parse_intent',
            status: 'blocked',
            description: 'Scaffold intent validation failed.',
          }),
        ],
        failures: parsedIntent.issues.map((issue) => `${issue.code}: ${issue.message}`),
        createdAt,
      });

      await this.reporter.write(result);

      return result;
    }

    steps.push(
      this.step({
        id: 'parse_intent',
        status: 'executed',
        description: 'Scaffold intent parsed.',
      }),
    );

    try {
      const convention = await this.conventionReader.read({
        projectRoot: input.projectRoot,
      });

      steps.push(
        this.step({
          id: 'read_project_conventions',
          status: 'executed',
          description: 'Project conventions detected.',
        }),
      );

      const request = this.requestBuilder.build({
        projectRoot: input.projectRoot,
        objective: input.objective,
        intent: parsedIntent.intent,
        convention,
      });

      steps.push(
        this.step({
          id: 'build_request',
          status: 'executed',
          description: 'Scaffold request built.',
        }),
      );

      const providerResult = await this.provider.generate({
        request,
      });

      steps.push(
        this.step({
          id: 'generate_proposal',
          status: 'executed',
          description: 'Scaffold provider returned raw proposal output.',
        }),
      );

      const parsedProposal = this.proposalParser.parse(providerResult.rawOutput);

      if (!parsedProposal.ok) {
        const result = this.buildResult({
          id,
          status: 'proposal_invalid',
          projectRoot: input.projectRoot,
          request,
          providerResult,
          proposalValidation: parsedProposal.validation,
          safety: this.emptySafety(),
          steps: [
            ...steps,
            this.step({
              id: 'parse_proposal',
              status: 'blocked',
              description: 'Scaffold proposal parsing or schema validation failed.',
            }),
          ],
          failures: parsedProposal.validation.issues.map(
            (issue) => `${issue.code}: ${issue.message}`,
          ),
          createdAt,
        });

        await this.reporter.write(result);

        return result;
      }

      steps.push(
        this.step({
          id: 'parse_proposal',
          status: 'executed',
          description: 'Scaffold proposal parsed and schema-valid.',
        }),
      );

      const safety = await this.safetyValidator.validate({
        request,
        proposal: parsedProposal.proposal,
      });

      if (!safety.safe) {
        const result = this.buildResult({
          id,
          status: 'safety_failed',
          projectRoot: input.projectRoot,
          request,
          providerResult,
          proposal: parsedProposal.proposal,
          proposalValidation: parsedProposal.validation,
          safety,
          steps: [
            ...steps,
            this.step({
              id: 'validate_safety',
              status: 'blocked',
              description: 'Scaffold proposal failed runtime safety validation.',
            }),
          ],
          failures: safety.issues.map((issue) => `${issue.code}: ${issue.message}`),
          createdAt,
        });

        await this.reporter.write(result);

        return result;
      }

      steps.push(
        this.step({
          id: 'validate_safety',
          status: 'executed',
          description: 'Scaffold proposal passed runtime safety validation.',
        }),
      );

      const patchProposal = await this.patchBridge.toPatchProposal({
        request,
        proposal: parsedProposal.proposal,
      });

      steps.push(
        this.step({
          id: 'build_patch_proposal',
          status: 'executed',
          description: 'PatchProposal built from validated scaffold proposal.',
        }),
      );

      const diffPreviews = await this.diffBuilder.build({
        projectRoot: input.projectRoot,
        proposal: patchProposal,
      });

      steps.push(
        this.step({
          id: 'build_diff_preview',
          status: 'executed',
          description: 'Diff previews built from scaffold patch proposal.',
        }),
      );

      const result = this.buildResult({
        id,
        status: 'patch_ready',
        projectRoot: input.projectRoot,
        request,
        providerResult,
        proposal: parsedProposal.proposal,
        proposalValidation: parsedProposal.validation,
        safety,
        patchProposal,
        diffPreviews,
        steps,
        failures,
        createdAt,
      });

      await this.reporter.write(result);

      return result;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));

      const result = this.buildResult({
        id,
        status: 'failed',
        projectRoot: input.projectRoot,
        proposalValidation: this.emptyValidation(),
        safety: this.emptySafety(),
        steps: [
          ...steps,
          this.step({
            id: 'run_scaffold',
            status: 'failed',
            description: 'Scaffold runner failed unexpectedly.',
          }),
        ],
        failures,
        createdAt,
      });

      await this.reporter.write(result);

      return result;
    }
  }

  private buildResult(input: {
    id: string;
    status: ScaffoldRunResult['status'];
    projectRoot: string;
    request?: ScaffoldRequest | undefined;
    providerResult?: ScaffoldRunResult['providerResult'] | undefined;
    proposal?: ScaffoldProposal | undefined;
    proposalValidation: ScaffoldProposalValidationResult;
    safety: ScaffoldSafetyValidationSummary;
    patchProposal?: PatchProposal | undefined;
    diffPreviews?: RepairDiffPreviewResult[] | undefined;
    steps: ScaffoldRunStep[];
    failures: string[];
    createdAt: string;
  }): ScaffoldRunResult {
    const result: ScaffoldRunResult = {
      id: input.id,
      status: input.status,
      projectRoot: input.projectRoot,
      proposalValidation: input.proposalValidation,
      safety: input.safety,
      diffPreviews: input.diffPreviews ?? [],
      steps: input.steps,
      failures: input.failures,
      createdAt: input.createdAt,
      completedAt: new Date().toISOString(),
    };

    if (input.request) {
      result.request = input.request;
      result.intent = input.request.intent;
    }

    if (input.providerResult) {
      result.providerResult = input.providerResult;
    }

    if (input.proposal) {
      result.proposal = input.proposal;
    }

    if (input.patchProposal) {
      result.patchProposal = input.patchProposal;
    }

    return result;
  }

  private emptyValidation(): ScaffoldProposalValidationResult {
    return {
      valid: false,
      issues: [],
    };
  }

  private emptySafety(): ScaffoldSafetyValidationSummary {
    return {
      safe: false,
      issues: [],
    };
  }

  private step(input: {
    id: string;
    status: ScaffoldRunStep['status'];
    description: string;
  }): ScaffoldRunStep {
    return {
      id: input.id,
      status: input.status,
      description: input.description,
      timestamp: new Date().toISOString(),
    };
  }
}
