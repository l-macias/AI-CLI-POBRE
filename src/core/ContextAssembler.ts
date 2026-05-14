import type {
  ContextAssemblyOptions,
  RuntimeContext,
  RuntimeContextSource,
} from '../types/ContextTypes.js';
import { TokenEstimator } from '../providers/TokenEstimator.js';

const priorityWeight = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
} as const;

export class ContextAssembler {
  private readonly tokenEstimator = new TokenEstimator();

  public assemble(
    sources: RuntimeContextSource[],
    options: ContextAssemblyOptions,
  ): RuntimeContext {
    const orderedSources = [...sources].sort((a, b) => {
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    });

    const includedSources: RuntimeContextSource[] = [];
    const sections: string[] = [];
    let tokenEstimate = 0;

    for (const source of orderedSources) {
      if (!source.content || source.content.trim().length === 0) {
        continue;
      }

      const section = this.renderSource(source);
      const sectionTokens = this.tokenEstimator.estimateTextTokens(section);

      if (tokenEstimate + sectionTokens > options.maxEstimatedTokens) {
        continue;
      }

      sections.push(section);
      includedSources.push(source);
      tokenEstimate += sectionTokens;
    }

    return {
      sources: includedSources,
      assembledContext: sections.join('\n\n---\n\n'),
      tokenEstimate,
    };
  }

  private renderSource(source: RuntimeContextSource): string {
    return `# Source: ${source.name}

${source.content?.trim() ?? ''}`;
  }
}
