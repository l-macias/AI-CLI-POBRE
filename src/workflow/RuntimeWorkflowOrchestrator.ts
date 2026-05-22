import { ExpressRouteScanner } from '../intelligence/api/ExpressRouteScanner.js';
import { FrontendBackendLinker } from '../intelligence/frontend/FrontendBackendLinker.js';
import { RuntimeQuestionEngine } from '../interactive/RuntimeQuestionEngine.js';
import { ProjectStackDetector } from '../languages/ProjectStackDetector.js';
import { SuggestionEngine } from '../suggestions/SuggestionEngine.js';
import { SessionTaskQueue } from '../tasks/SessionTaskQueue.js';
import {
  PackageScriptScanner,
  type PackageScriptScanResult,
} from '../verify/PackageScriptScanner.js';
import type {
  RuntimeWorkflowPrepareInput,
  RuntimeWorkflowPrepareResult,
} from './RuntimeWorkflowTypes.js';

export interface RuntimeWorkflowOrchestratorOptions {
  taskQueue?: SessionTaskQueue | undefined;
  projectStackDetector?: ProjectStackDetector | undefined;
  expressRouteScanner?: ExpressRouteScanner | undefined;
  frontendBackendLinker?: FrontendBackendLinker | undefined;
  questionEngine?: RuntimeQuestionEngine | undefined;
  suggestionEngine?: SuggestionEngine | undefined;
  packageScriptScanner?: PackageScriptScanner | undefined;
}

export class RuntimeWorkflowOrchestrator {
  private readonly taskQueue: SessionTaskQueue;
  private readonly projectStackDetector: ProjectStackDetector;
  private readonly expressRouteScanner: ExpressRouteScanner;
  private readonly frontendBackendLinker: FrontendBackendLinker;
  private readonly questionEngine: RuntimeQuestionEngine;
  private readonly suggestionEngine: SuggestionEngine;
  private readonly packageScriptScanner: PackageScriptScanner;

  public constructor(options: RuntimeWorkflowOrchestratorOptions = {}) {
    this.taskQueue = options.taskQueue ?? new SessionTaskQueue();
    this.projectStackDetector = options.projectStackDetector ?? new ProjectStackDetector();
    this.expressRouteScanner = options.expressRouteScanner ?? new ExpressRouteScanner();
    this.frontendBackendLinker = options.frontendBackendLinker ?? new FrontendBackendLinker();
    this.questionEngine = options.questionEngine ?? new RuntimeQuestionEngine();
    this.suggestionEngine = options.suggestionEngine ?? new SuggestionEngine();
    this.packageScriptScanner = options.packageScriptScanner ?? new PackageScriptScanner();
  }

  public async prepare(input: RuntimeWorkflowPrepareInput): Promise<RuntimeWorkflowPrepareResult> {
    const tasks =
      input.createDefaultTasks === false
        ? await this.taskQueue.loadOrCreate(input.sessionId)
        : await this.ensureDefaultTasks(input.sessionId);

    const [stack, apiRoutes] = await Promise.all([
      this.projectStackDetector.detect(input.projectRoot),
      this.expressRouteScanner.scan(input.projectRoot),
    ]);

    const frontendBackend = await this.frontendBackendLinker.link({
      projectRoot: input.projectRoot,
      routeMap: apiRoutes,
    });

    const verifyScripts = await this.safeScanPackageScripts(input.projectRoot);

    const runtimeActions = [
      {
        title: 'Workflow prepared',
        description:
          'Runtime workflow orchestrator prepared tasks, intelligence, questions, suggestions and verify scripts.',
        status: 'completed',
      },
      {
        title: 'Project intelligence generated',
        description: `Detected stack: ${stack.stack.join(', ')}`,
        status: 'completed',
      },
      {
        title: 'API routes mapped',
        description: `Detected ${apiRoutes.routes.length} backend route(s).`,
        status: 'completed',
      },
      {
        title: 'Frontend backend links generated',
        description: `Detected ${frontendBackend.links.length} frontend/backend link(s).`,
        status: 'completed',
      },
    ];

    const questions = this.questionEngine.generate({
      objective: input.objective,
      projectRoot: input.projectRoot,
      projectName: input.projectName,
      stack: stack.stack,
      ...(input.workspaceMode ? { workspaceMode: input.workspaceMode } : {}),
      runtimeActions,
    });

    const suggestions = this.suggestionEngine.scan({
      projectRoot: input.projectRoot,
      projectName: input.projectName,
      stack: stack.stack,
      workspaceMode: input.workspaceMode ?? 'local_snapshot',
      gitAvailable: false,
      snapshotAvailable: false,
      runtimeActions,
      errors: [],
    });

    const taskProgress = await this.taskQueue.progress(input.sessionId);

    return {
      sessionId: input.sessionId,
      projectRoot: input.projectRoot,
      projectName: input.projectName,
      objective: input.objective,
      workflowStatus: 'prepared',
      tasks,
      taskProgress,
      stack,
      apiRoutes,
      frontendBackend,
      questions,
      suggestions: suggestions.suggestions,
      verifyScripts,
      generatedAt: new Date().toISOString(),
    };
  }

  private async ensureDefaultTasks(sessionId: string) {
    const existing = await this.taskQueue.loadOrCreate(sessionId);

    if (existing.tasks.length > 0) {
      return existing;
    }

    return this.taskQueue.addTasks(sessionId, [
      {
        sessionId,
        title: 'Analyze project stack',
        description: 'Detect frontend, backend, database and framework boundaries.',
        kind: 'inspect',
      },
      {
        sessionId,
        title: 'Map backend API routes',
        description: 'Scan Express routes, controllers and middlewares.',
        kind: 'context',
      },
      {
        sessionId,
        title: 'Link frontend API usage',
        description: 'Connect frontend fetch/axios usage with backend endpoints.',
        kind: 'context',
      },
      {
        sessionId,
        title: 'Prepare runtime questions',
        description: 'Generate questions only where answers change runtime behavior.',
        kind: 'approval',
      },
      {
        sessionId,
        title: 'Prepare safe verification',
        description: 'Detect safe package scripts and approved verification commands.',
        kind: 'verify',
      },
      {
        sessionId,
        title: 'Export session report',
        description: 'Generate Markdown and JSON report after workflow execution.',
        kind: 'report',
      },
    ]);
  }

  private async safeScanPackageScripts(
    projectRoot: string,
  ): Promise<PackageScriptScanResult | null> {
    try {
      return await this.packageScriptScanner.scan(projectRoot);
    } catch {
      return null;
    }
  }
}
