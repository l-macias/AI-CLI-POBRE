import type { ApiRouteMap } from '../intelligence/api/ApiRouteMap.js';
import type { FrontendBackendLinkResult } from '../intelligence/frontend/FrontendBackendLinker.js';
import type { RuntimeQuestionEngineResult } from '../interactive/RuntimeQuestion.js';
import type { ProjectStackDetectionResult } from '../languages/ProjectStackDetector.js';
import type { PackageScriptScanResult } from '../verify/PackageScriptScanner.js';
import type { RuntimeSuggestion } from '../suggestions/SuggestionTypes.js';
import type { SessionTaskQueueState } from '../tasks/SessionTask.js';
import type { TaskProgressReport } from '../tasks/TaskProgressReporter.js';

export interface RuntimeWorkflowPrepareInput {
  sessionId: string;
  projectRoot: string;
  projectName: string;
  objective: string;
  workspaceMode?: string | undefined;
  createDefaultTasks?: boolean | undefined;
}

export interface RuntimeWorkflowPrepareResult {
  sessionId: string;
  projectRoot: string;
  projectName: string;
  objective: string;
  workflowStatus: 'prepared';
  tasks: SessionTaskQueueState;
  taskProgress: TaskProgressReport;
  stack: ProjectStackDetectionResult;
  apiRoutes: ApiRouteMap;
  frontendBackend: FrontendBackendLinkResult;
  questions: RuntimeQuestionEngineResult;
  suggestions: RuntimeSuggestion[];
  verifyScripts: PackageScriptScanResult | null;
  generatedAt: string;
}
