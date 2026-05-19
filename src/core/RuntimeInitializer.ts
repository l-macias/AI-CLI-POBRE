import type { RuntimeContext, RuntimeContextSource } from '../types/ContextTypes.js';
import { ContextAssembler } from './ContextAssembler.js';
import { SessionPersistence } from '../session/SessionPersistence.js';
import { ProjectMemoryReader } from '../memory/ProjectMemoryReader.js';
import { ProjectMemoryStore } from '../memory/ProjectMemoryStore.js';

export interface RuntimeInitializerOptions {
  maxEstimatedContextTokens?: number;
  preferCompressedContext?: boolean | undefined;
  includeProjectMemory?: boolean | undefined;
  projectRoot?: string | undefined;
  projectName?: string | undefined;
}

export class RuntimeInitializer {
  private readonly persistence = new SessionPersistence();
  private readonly assembler = new ContextAssembler();

  public async initialize(options: RuntimeInitializerOptions = {}): Promise<RuntimeContext> {
    const maxEstimatedTokens = options.maxEstimatedContextTokens ?? 1500;
    const preferCompressedContext = options.preferCompressedContext ?? true;

    const compressedSources = preferCompressedContext ? await this.loadCompressedSources() : [];

    const baseSources =
      compressedSources.length > 0 ? compressedSources : await this.loadRawRuntimeSources();

    const projectMemorySources = await this.loadProjectMemorySources(options);
    const sources = [...baseSources, ...projectMemorySources];

    return this.assembler.assemble(sources, {
      maxEstimatedTokens,
    });
  }

  public async loadRawRuntimeSources(): Promise<RuntimeContextSource[]> {
    return [
      {
        name: '.runtime/current-state.md',
        content: await this.persistence.readRuntimeFile('current-state.md'),
        priority: 'critical',
      },
      {
        name: '.runtime/handoff.md',
        content: await this.persistence.readRuntimeFile('handoff.md'),
        priority: 'critical',
      },
      {
        name: '.runtime/next-steps.md',
        content: await this.persistence.readRuntimeFile('next-steps.md'),
        priority: 'high',
      },
      {
        name: '.runtime/active-module.md',
        content: await this.persistence.readRuntimeFile('active-module.md'),
        priority: 'high',
      },
      {
        name: '.runtime/decisions.md',
        content: await this.persistence.readRuntimeFile('decisions.md'),
        priority: 'medium',
      },
      {
        name: '.runtime/progress-log.md',
        content: await this.persistence.readRuntimeFile('progress-log.md'),
        priority: 'low',
      },
    ];
  }

  private async loadCompressedSources(): Promise<RuntimeContextSource[]> {
    const summary = await this.persistence.readRuntimeFile('runtime-summary.md');
    const compressedContext = await this.persistence.readRuntimeFile('compressed-context.md');

    const sources: RuntimeContextSource[] = [];

    if (summary?.trim()) {
      sources.push({
        name: '.runtime/runtime-summary.md',
        content: summary,
        priority: 'critical',
      });
    }

    if (compressedContext?.trim()) {
      sources.push({
        name: '.runtime/compressed-context.md',
        content: compressedContext,
        priority: 'high',
      });
    }

    return sources;
  }

  private async loadProjectMemorySources(
    options: RuntimeInitializerOptions,
  ): Promise<RuntimeContextSource[]> {
    if (options.includeProjectMemory !== true) {
      return [];
    }

    const projectRoot = options.projectRoot ?? process.cwd();

    const reader = new ProjectMemoryReader({
      store: new ProjectMemoryStore({
        projectRoot,
        projectName: options.projectName ?? 'target-project',
      }),
    });

    const source = await reader.readContextSource();

    return source ? [source] : [];
  }
}
