import type { RuntimeContextSource } from '../types/ContextTypes.js';
import type { ContextCompressionResult, RuntimeSummary } from '../types/MemoryTypes.js';
import { SessionPersistence } from '../session/SessionPersistence.js';
import { ContextCompressor } from './ContextCompressor.js';
import { SummaryMemory } from './SummaryMemory.js';

export interface MemoryCompactionResult {
  compression: ContextCompressionResult;
  summary: RuntimeSummary;
  writtenFiles: string[];
}

export class MemoryCompactor {
  private readonly persistence = new SessionPersistence();
  private readonly compressor = new ContextCompressor();
  private readonly summaryMemory = new SummaryMemory();

  public async compact(sources: RuntimeContextSource[]): Promise<MemoryCompactionResult> {
    const compression = this.compressor.compress({
      sources,
    });

    const currentState = await this.persistence.readRuntimeFile('current-state.md');
    const activeModule = await this.persistence.readRuntimeFile('active-module.md');
    const nextSteps = await this.persistence.readRuntimeFile('next-steps.md');
    const decisions = await this.persistence.readRuntimeFile('decisions.md');
    const progressLog = await this.persistence.readRuntimeFile('progress-log.md');

    const summary = this.summaryMemory.create({
      projectName: 'Zero Runtime',
      currentState,
      activeModule,
      nextSteps,
      decisions,
      progressLog,
    });

    await this.persistence.writeRuntimeFile(
      'compressed-context.md',
      this.renderCompressedContext(compression),
    );

    await this.persistence.writeRuntimeFile(
      'runtime-summary.md',
      this.summaryMemory.render(summary),
    );

    return {
      compression,
      summary,
      writtenFiles: ['.runtime/compressed-context.md', '.runtime/runtime-summary.md'],
    };
  }

  private renderCompressedContext(compression: ContextCompressionResult): string {
    return `# Compressed Runtime Context

Created at: ${compression.createdAt}

Original characters: ${String(compression.originalCharacters)}

Compressed characters: ${String(compression.compressedCharacters)}

Compression ratio: ${String(compression.compressionRatio)}

---

${compression.compressedContext}
`;
  }
}
