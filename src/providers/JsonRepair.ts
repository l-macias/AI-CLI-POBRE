export class JsonRepair {
  public repair(input: string): string {
    const cleaned = this.stripMarkdown(input.trim());
    const extracted = this.extractFirstJsonObject(cleaned) ?? cleaned;

    return this.escapeControlCharactersInsideStrings(extracted);
  }

  private stripMarkdown(input: string): string {
    return input
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  private extractFirstJsonObject(input: string): string | null {
    const start = input.indexOf('{');

    if (start === -1) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < input.length; index += 1) {
      const char = input[index];

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
      }

      if (depth === 0) {
        return input.slice(start, index + 1);
      }
    }

    return null;
  }

  private escapeControlCharactersInsideStrings(input: string): string {
    let output = '';
    let inString = false;
    let escaped = false;

    for (const char of input) {
      if (escaped) {
        output += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        output += char;
        escaped = true;
        continue;
      }

      if (char === '"') {
        output += char;
        inString = !inString;
        continue;
      }

      if (!inString) {
        output += char;
        continue;
      }

      output += this.escapeControlCharacter(char);
    }

    return output;
  }

  private escapeControlCharacter(char: string): string {
    if (char === '\n') {
      return '\\n';
    }

    if (char === '\r') {
      return '\\r';
    }

    if (char === '\t') {
      return '\\t';
    }

    if (char === '\b') {
      return '\\b';
    }

    if (char === '\f') {
      return '\\f';
    }

    return char;
  }
}
