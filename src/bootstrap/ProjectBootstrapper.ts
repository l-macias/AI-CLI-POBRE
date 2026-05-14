import type {
  RuntimeBootstrapPlan,
  RuntimeBootstrapWriteInput,
  RuntimeBootstrapWriteResult,
} from './BootstrapTypes.js';
import { RuntimeBootstrapPlanner } from './RuntimeBootstrapPlanner.js';
import { RuntimeBootstrapWriter } from './RuntimeBootstrapWriter.js';

export interface ProjectBootstrapperOptions {
  planner?: RuntimeBootstrapPlanner | undefined;
  writer?: RuntimeBootstrapWriter | undefined;
}

export class ProjectBootstrapper {
  private readonly planner: RuntimeBootstrapPlanner;
  private readonly writer: RuntimeBootstrapWriter;

  public constructor(options: ProjectBootstrapperOptions = {}) {
    this.planner = options.planner ?? new RuntimeBootstrapPlanner();
    this.writer =
      options.writer ??
      new RuntimeBootstrapWriter({
        planner: this.planner,
      });
  }

  public async preview(rootDir: string): Promise<RuntimeBootstrapPlan> {
    return this.planner.plan(rootDir);
  }

  public async write(input: RuntimeBootstrapWriteInput): Promise<RuntimeBootstrapWriteResult> {
    return this.writer.write(input);
  }
}
