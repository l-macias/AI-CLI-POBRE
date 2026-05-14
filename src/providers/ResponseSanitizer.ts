export class ResponseSanitizer {
  public sanitizeContent(content: string): string {
    return content.trim();
  }

  public sanitizeJsonLikeContent(content: string): string {
    const trimmed = this.sanitizeContent(content);

    if (trimmed.startsWith("```json")) {
      return trimmed
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "")
        .trim();
    }

    if (trimmed.startsWith("```")) {
      return trimmed
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();
    }

    return trimmed;
  }
}
