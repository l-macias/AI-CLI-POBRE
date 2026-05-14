import type { RuntimeContextSource } from '../types/ContextTypes.js';
import type {
  CompressedContextSource,
  ContextCompressionInput,
  ContextCompressionResult,
} from '../types/MemoryTypes.js';
import { CompressionPolicy } from './CompressionPolicy.js';

export class ContextCompressor {
  private readonly policyFactory = new CompressionPolicy();

  public compress(input: ContextCompressionInput): ContextCompressionResult {
    const policy = this.policyFactory.merge(input.policy);
    const createdAt = new Date().toISOString();

    const compressedSources = input.sources
      .filter((source) => source.content !== null && source.content.trim().length > 0)
      .map((source) => this.compressSource(source, policy.maxSourceCharacters));

    const originalCharacters = compressedSources.reduce(
      (total, source) => total + source.originalCharacters,
      0,
    );

    const compressedCharacters = compressedSources.reduce(
      (total, source) => total + source.compressedCharacters,
      0,
    );

    const compressedContext = compressedSources
      .map((source) => {
        return `# Source: ${source.name}

${source.content}`;
      })
      .join('\n\n---\n\n');

    return {
      compressedSources,
      compressedContext,
      originalCharacters,
      compressedCharacters,
      compressionRatio:
        originalCharacters === 0
          ? 1
          : Number((compressedCharacters / originalCharacters).toFixed(4)),
      createdAt,
    };
  }

  private compressSource(
    source: RuntimeContextSource,
    maxCharacters: number,
  ): CompressedContextSource {
    const content = source.content?.trim() ?? '';
    const normalized = this.normalize(content);

    const compressed =
      normalized.length <= maxCharacters
        ? normalized
        : this.truncateAtBoundary(normalized, maxCharacters);

    return {
      name: source.name,
      priority: source.priority,
      originalCharacters: content.length,
      compressedCharacters: compressed.length,
      content: compressed,
    };
  }

  private normalize(content: string): string {
    return content
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line, index, lines) => {
        const previous = lines[index - 1];

        return !(line.trim() === '' && previous?.trim() === '');
      })
      .join('\n')
      .trim();
  }

  private truncateAtBoundary(content: string, maxCharacters: number): string {
    const sliced = content.slice(0, maxCharacters);
    const lastHeading = sliced.lastIndexOf('\n## ');
    const lastBullet = sliced.lastIndexOf('\n- ');
    const boundary = Math.max(lastHeading, lastBullet);

    if (boundary > Math.floor(maxCharacters * 0.5)) {
      return `${sliced.slice(0, boundary).trim()}

[compressed: truncated at safe boundary]`;
    }

    return `${sliced.trim()}

[compressed: truncated by character limit]`;
  }
}
