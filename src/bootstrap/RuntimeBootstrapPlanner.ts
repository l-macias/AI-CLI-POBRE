import type { RuntimeBootstrapPlan, RuntimeBootstrapPlanIssue } from './BootstrapTypes.js';
import { RuntimeBootstrapTemplate } from './RuntimeBootstrapTemplate.js';
import { RuntimeDirectoryInspector } from './RuntimeDirectoryInspector.js';
import { StackDetector } from './StackDetector.js';

export interface RuntimeBootstrapPlannerOptions {
  stackDetector?: StackDetector | undefined;
  inspector?: RuntimeDirectoryInspector | undefined;
  template?: RuntimeBootstrapTemplate | undefined;
}

export class RuntimeBootstrapPlanner {
  private readonly stackDetector: StackDetector;
  private readonly inspector: RuntimeDirectoryInspector;
  private readonly template: RuntimeBootstrapTemplate;

  public constructor(options: RuntimeBootstrapPlannerOptions = {}) {
    this.stackDetector = options.stackDetector ?? new StackDetector();
    this.inspector = options.inspector ?? new RuntimeDirectoryInspector();
    this.template = options.template ?? new RuntimeBootstrapTemplate();
  }

  public async plan(rootDir: string): Promise<RuntimeBootstrapPlan> {
    const stack = await this.stackDetector.detect(rootDir);
    const inspection = await this.inspector.inspect(rootDir);
    const files = this.template.buildFiles(stack);
    const issues = this.resolveIssues(inspection.runtimeExists);

    return {
      rootDir,
      status: inspection.runtimeExists ? 'blocked' : 'ready',
      files,
      inspection,
      stack,
      issues,
      createdAt: new Date().toISOString(),
    };
  }

  private resolveIssues(runtimeExists: boolean): RuntimeBootstrapPlanIssue[] {
    if (!runtimeExists) {
      return [];
    }

    return [
      {
        code: 'RUNTIME_DIRECTORY_ALREADY_EXISTS',
        message:
          '.runtime already exists. Bootstrap write is blocked unless overwrite is explicitly confirmed.',
        severity: 'warning',
      },
    ];
  }
}
