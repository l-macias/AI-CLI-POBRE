import { RuntimeApiResponse } from './RuntimeApiResponse.js';
import type { RuntimeApiController } from './RuntimeApiController.js';
import type { RuntimeApiRequest, RuntimeApiRouteResult } from './RuntimeApiTypes.js';

export interface RuntimeApiRouterOptions {
  controller: RuntimeApiController;
  response?: RuntimeApiResponse | undefined;
}

export class RuntimeApiRouter {
  private readonly controller: RuntimeApiController;
  private readonly response: RuntimeApiResponse;

  public constructor(options: RuntimeApiRouterOptions) {
    this.controller = options.controller;
    this.response = options.response ?? new RuntimeApiResponse();
  }

  public async route(request: RuntimeApiRequest): Promise<RuntimeApiRouteResult> {
    try {
      if (request.method === 'GET' && this.isPath(request.path, '/health')) {
        return this.controller.health();
      }

      if (request.method === 'GET' && this.isPath(request.path, '/artifacts')) {
        return this.controller.listRuntimeArtifacts();
      }

      if (request.method === 'GET' && this.isPath(request.path, '/artifacts/read')) {
        return this.controller.readRuntimeArtifact(request.query.get('path'));
      }

      if (request.method === 'GET' && this.isPath(request.path, '/filesystem/roots')) {
        return this.controller.listFilesystemRoots();
      }

      if (request.method === 'GET' && this.isPath(request.path, '/filesystem/children')) {
        return this.controller.listFilesystemChildren(request.query.get('path'));
      }

      if (request.method === 'GET' && this.isPath(request.path, '/sessions')) {
        return this.controller.listSessions();
      }

      if (request.method === 'POST' && this.isPath(request.path, '/sessions')) {
        return this.controller.startSession(request.body);
      }

      const sessionMatch = this.matchSessionPath(request.path);

      if (request.method === 'GET' && sessionMatch?.kind === 'session') {
        return this.controller.getSession(sessionMatch.sessionId);
      }

      if (request.method === 'POST' && sessionMatch?.kind === 'commands') {
        return this.controller.routeCommand(sessionMatch.sessionId, request.body);
      }

      if (request.method === 'GET' && sessionMatch?.kind === 'tasks') {
        return this.controller.getSessionTasks(sessionMatch.sessionId);
      }

      if (request.method === 'POST' && sessionMatch?.kind === 'tasks') {
        return this.controller.createSessionTask(sessionMatch.sessionId, request.body);
      }

      if (request.method === 'POST' && sessionMatch?.kind === 'task_transition') {
        return this.controller.transitionSessionTask(
          sessionMatch.sessionId,
          sessionMatch.taskId,
          request.body,
        );
      }

      if (request.method === 'GET' && this.isPath(request.path, '/projects')) {
        return this.controller.listProjects();
      }

      if (request.method === 'GET' && this.isPath(request.path, '/projects/current')) {
        return this.controller.currentProject();
      }

      if (request.method === 'POST' && this.isPath(request.path, '/projects/scan')) {
        return this.controller.scanProject(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/workspace/resolve')) {
        return this.controller.resolveWorkspace(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/suggestions')) {
        return this.controller.getSuggestions(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/questions')) {
        return this.controller.getQuestions(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/questions/answer')) {
        return this.controller.answerQuestion(request.body);
      }

      if (request.method === 'GET' && this.isPath(request.path, '/verify/commands')) {
        return this.controller.listVerifyCommands();
      }

      if (request.method === 'POST' && this.isPath(request.path, '/verify/scripts')) {
        return this.controller.scanPackageScripts(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/verify/run')) {
        return this.controller.runVerifyCommand(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/reports/export')) {
        return this.controller.exportSessionReport(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/intelligence/stack')) {
        return this.controller.detectProjectStack(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/intelligence/api-routes')) {
        return this.controller.mapApiRoutes(request.body);
      }

      if (
        request.method === 'POST' &&
        this.isPath(request.path, '/intelligence/frontend-backend')
      ) {
        return this.controller.linkFrontendBackend(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/intelligence/context-graph')) {
        return this.controller.generateContextGraph(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/snapshots')) {
        return this.controller.createSnapshot(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/snapshots/after')) {
        return this.controller.captureSnapshotAfter(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/snapshots/restore')) {
        return this.controller.restoreSnapshot(request.body);
      }

      if (request.method === 'GET' && this.isPath(request.path, '/settings')) {
        return this.controller.getRuntimeSettings();
      }

      if (request.method === 'POST' && this.isPath(request.path, '/settings')) {
        return this.controller.saveRuntimeSettings(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/workflow/prepare')) {
        return this.controller.prepareWorkflow(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/workflow/state')) {
        return this.controller.buildWorkflowState(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/approvals/center')) {
        return this.controller.buildApprovalCenter(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/approvals/resolve')) {
        return this.controller.resolveApproval(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/memory/session')) {
        return this.controller.getSessionMemory(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/memory/session/decisions')) {
        return this.controller.addSessionMemoryDecision(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/memory/project/entries')) {
        return this.controller.addProjectMemoryEntry(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/plans/generate')) {
        return this.controller.generateRuntimePlan(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/patches/propose')) {
        return this.controller.generatePatchProposal(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/patches/diff')) {
        return this.controller.generatePatchDiff(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/patches/sandbox/verify')) {
        return this.controller.verifyPatchSandbox(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/patches/recovery/prepare')) {
        return this.controller.preparePatchRecovery(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/patches/recovery/generate')) {
        return this.controller.generatePatchRecoveryProposal(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/patches/apply')) {
        return this.controller.applyRuntimePatch(request.body);
      }

      if (request.method === 'POST' && this.isPath(request.path, '/patches/rollback')) {
        return this.controller.rollbackRuntimePatch(request.body);
      }
      if (request.method === 'GET' && this.isPath(request.path, '/maintenance/inventory')) {
        return this.controller.getRuntimeDataInventory();
      }
      if (request.method === 'POST' && this.isPath(request.path, '/maintenance/archive')) {
        return this.controller.archiveRuntimeSessions(request.body);
      }
      if (request.method === 'POST' && this.isPath(request.path, '/maintenance/restore')) {
        return this.controller.restoreRuntimeSessions(request.body);
      }
      if (request.method === 'GET' && this.isPath(request.path, '/providers/status')) {
        return this.controller.getProviderStatus();
      }

      return this.response.notFound(request.path);
    } catch (error) {
      return this.response.error(400, [
        {
          code: 'RUNTIME_API_REQUEST_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      ]);
    }
  }

  private isPath(actual: string, expectedWithoutApiPrefix: string): boolean {
    return actual === expectedWithoutApiPrefix || actual === `/api${expectedWithoutApiPrefix}`;
  }

  private matchSessionPath(path: string):
    | {
        kind: 'session' | 'commands' | 'tasks';
        sessionId: string;
      }
    | {
        kind: 'task_transition';
        sessionId: string;
        taskId: string;
      }
    | undefined {
    const normalized = path.startsWith('/api/') ? path.slice(4) : path;

    const sessionMatch = normalized.match(/^\/sessions\/([^/]+)$/);

    if (sessionMatch?.[1]) {
      return {
        kind: 'session',
        sessionId: decodeURIComponent(sessionMatch[1]),
      };
    }

    const commandMatch = normalized.match(/^\/sessions\/([^/]+)\/commands$/);

    if (commandMatch?.[1]) {
      return {
        kind: 'commands',
        sessionId: decodeURIComponent(commandMatch[1]),
      };
    }

    const tasksMatch = normalized.match(/^\/sessions\/([^/]+)\/tasks$/);

    if (tasksMatch?.[1]) {
      return {
        kind: 'tasks',
        sessionId: decodeURIComponent(tasksMatch[1]),
      };
    }

    const taskTransitionMatch = normalized.match(
      /^\/sessions\/([^/]+)\/tasks\/([^/]+)\/transition$/,
    );

    if (taskTransitionMatch?.[1] && taskTransitionMatch[2]) {
      return {
        kind: 'task_transition',
        sessionId: decodeURIComponent(taskTransitionMatch[1]),
        taskId: decodeURIComponent(taskTransitionMatch[2]),
      };
    }

    return undefined;
  }
}
