import type {
  RetrievalPlanningContext,
  RetrievalPlanningContextInput,
} from '../types/RetrievalContextTypes.js';
import { ContextRetriever } from './ContextRetriever.js';
import { RetrievalContextBuilder } from './RetrievalContextBuilder.js';

export interface PlanningContextRetrieverOptions {
  retriever?: ContextRetriever | undefined;
  builder?: RetrievalContextBuilder | undefined;
}

export class PlanningContextRetriever {
  private readonly retriever: ContextRetriever;
  private readonly builder: RetrievalContextBuilder;

  public constructor(options: PlanningContextRetrieverOptions = {}) {
    this.retriever = options.retriever ?? new ContextRetriever();
    this.builder = options.builder ?? new RetrievalContextBuilder();
  }

  public async retrieve(input: RetrievalPlanningContextInput): Promise<RetrievalPlanningContext> {
    const query = this.buildQuery(input);

    const retrieval = await this.retriever.retrieve({
      query,
      maxChunks: input.maxChunks ?? 6,
      excludePaths: ['src/examples/'],
    });

    return {
      query,
      retrieval,
      context: this.builder.build(retrieval.chunks),
      createdAt: new Date().toISOString(),
    };
  }

  private buildQuery(input: RetrievalPlanningContextInput): string {
    return [input.objective, input.module].join(' ').trim();
  }
}
