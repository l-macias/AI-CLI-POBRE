export class JsonRepair {
  public repair(input: string): string {
    const cleaned = this.stripMarkdown(input.trim());
    const extracted = this.extractFirstJsonObject(cleaned);

    return extracted ?? cleaned;
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

    for (let i = start; i < input.length; i += 1) {
      const char = input[i];

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
        return input.slice(start, i + 1);
      }
    }

    return null;
  }
}
