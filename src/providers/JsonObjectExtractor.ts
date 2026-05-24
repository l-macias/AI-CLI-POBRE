export interface JsonObjectExtractionResult {
  content: string;
  extracted: boolean;
  strategy: 'raw' | 'fenced_json' | 'balanced_object';
}

export class JsonObjectExtractor {
  public extract(content: string): JsonObjectExtractionResult {
    const trimmed = content.trim();

    const fenced = this.extractFromFence(trimmed);

    if (fenced) {
      return {
        content: fenced,
        extracted: true,
        strategy: 'fenced_json',
      };
    }

    const balanced = this.extractBalancedObject(trimmed);

    if (balanced && balanced !== trimmed) {
      return {
        content: balanced,
        extracted: true,
        strategy: 'balanced_object',
      };
    }

    return {
      content: trimmed,
      extracted: false,
      strategy: 'raw',
    };
  }

  private extractFromFence(content: string): string | null {
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/iu);
    const candidate = fenceMatch?.[1]?.trim();

    return candidate && candidate.length > 0 ? candidate : null;
  }

  private extractBalancedObject(content: string): string | null {
    const start = content.indexOf('{');

    if (start < 0) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < content.length; index += 1) {
      const char = content[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        depth += 1;
      }

      if (char === '}') {
        depth -= 1;

        if (depth === 0) {
          return content.slice(start, index + 1).trim();
        }
      }
    }

    return null;
  }
}
