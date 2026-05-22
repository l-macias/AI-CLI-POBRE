import { existsSync } from 'node:fs';
import path from 'node:path';

export type RuntimeReadinessStatus = 'passed' | 'warning' | 'failed';

export interface RuntimeReadinessCheckItem {
  name: string;
  status: RuntimeReadinessStatus;
  message: string;
}

export interface RuntimeReadinessReport {
  status: RuntimeReadinessStatus;
  projectRoot: string;
  checks: RuntimeReadinessCheckItem[];
  generatedAt: string;
}

export class RuntimeReadinessCheck {
  public run(projectRoot = process.cwd()): RuntimeReadinessReport {
    const checks: RuntimeReadinessCheckItem[] = [
      this.fileCheck(projectRoot, 'src/interactive/InteractiveSession.ts'),
      this.fileCheck(projectRoot, 'src/interactive/InteractiveCommandRouter.ts'),
      this.fileCheck(projectRoot, 'src/tasks/SessionTaskQueue.ts'),
      this.fileCheck(projectRoot, 'src/interactive/RuntimeQuestionEngine.ts'),
      this.fileCheck(projectRoot, 'src/interactive/RuntimeQuestionDecisionMapper.ts'),
      this.fileCheck(projectRoot, 'src/interactive/SessionDecisionStore.ts'),
      this.fileCheck(projectRoot, 'src/suggestions/SuggestionEngine.ts'),
      this.fileCheck(projectRoot, 'src/workflow/RuntimeWorkflowOrchestrator.ts'),
      this.fileCheck(projectRoot, 'src/verify/VerifyRunner.ts'),
      this.fileCheck(projectRoot, 'src/verify/VerifyRunStore.ts'),
      this.fileCheck(projectRoot, 'src/reports/SessionReportBuilder.ts'),
      this.fileCheck(projectRoot, 'src/reports/ReportStorage.ts'),
      this.fileCheck(projectRoot, 'src/settings/RuntimeSettingsStore.ts'),
      this.fileCheck(projectRoot, 'src/languages/ProjectStackDetector.ts'),
      this.fileCheck(projectRoot, 'src/intelligence/api/ExpressRouteScanner.ts'),
      this.fileCheck(projectRoot, 'src/intelligence/frontend/FrontendBackendLinker.ts'),
      this.fileCheck(projectRoot, 'src/api/RuntimeApiController.ts'),
      this.fileCheck(projectRoot, 'src/api/RuntimeApiRouter.ts'),
      this.fileCheck(projectRoot, 'src/launcher/LocalAppLauncher.ts'),
      this.fileCheck(projectRoot, 'ui/src/pages/SessionPage.tsx'),
      this.fileCheck(projectRoot, 'ui/src/pages/SettingsPage.tsx'),
      this.fileCheck(projectRoot, 'ui/src/components/context/IntelligentContextPanel.tsx'),
      this.fileCheck(projectRoot, 'ui/src/components/snapshots/SnapshotPanel.tsx'),
      this.fileCheck(projectRoot, 'ui/src/components/verify/VerifyPanel.tsx'),
      this.fileCheck(projectRoot, 'ui/src/components/reports/ReportExportPanel.tsx'),
    ];

    return {
      status: this.resolveStatus(checks),
      projectRoot,
      checks,
      generatedAt: new Date().toISOString(),
    };
  }

  private fileCheck(projectRoot: string, relativePath: string): RuntimeReadinessCheckItem {
    const absolutePath = path.join(projectRoot, relativePath);
    const exists = existsSync(absolutePath);

    return {
      name: `file:${relativePath}`,
      status: exists ? 'passed' : 'failed',
      message: exists ? 'Required file exists.' : `Missing required file: ${relativePath}`,
    };
  }

  private resolveStatus(checks: RuntimeReadinessCheckItem[]): RuntimeReadinessStatus {
    if (checks.some((check) => check.status === 'failed')) {
      return 'failed';
    }

    if (checks.some((check) => check.status === 'warning')) {
      return 'warning';
    }

    return 'passed';
  }
}
