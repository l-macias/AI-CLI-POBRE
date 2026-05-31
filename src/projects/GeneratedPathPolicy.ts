const generatedPathSegmentNames = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.open-next',
  '.wrangler',
  '.turbo',
  '.vercel',
  '.cache',
  'coverage',
  '.runtime',
] as const;

const generatedPathPrefixes = ['public/build'] as const;

export interface GeneratedPathPolicyDecision {
  allowed: boolean;
  normalizedPath: string;
  reason?: string | undefined;
}

export class GeneratedPathPolicy {
  public isGeneratedPath(value: string): boolean {
    return !this.evaluate(value).allowed;
  }

  public isGeneratedPathSegmentName(value: string): boolean {
    const normalized = this.normalizeSegment(value);

    return generatedPathSegmentNames.some((segment) => segment === normalized);
  }

  public filterSafePaths(paths: string[]): string[] {
    return paths.filter((filePath) => this.evaluate(filePath).allowed);
  }

  public evaluate(value: string): GeneratedPathPolicyDecision {
    const normalizedPath = this.normalizePath(value);

    if (normalizedPath.length === 0 || normalizedPath === '.') {
      return {
        allowed: true,
        normalizedPath,
      };
    }

    const segments = normalizedPath.split('/').filter((segment) => segment.length > 0);

    const blockedSegment = segments.find((segment) => {
      return generatedPathSegmentNames.some((blocked) => blocked === segment);
    });

    if (blockedSegment) {
      return {
        allowed: false,
        normalizedPath,
        reason: `Generated/dependency/cache path segment is blocked: ${blockedSegment}`,
      };
    }

    const blockedPrefix = generatedPathPrefixes.find((prefix) => {
      return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
    });

    if (blockedPrefix) {
      return {
        allowed: false,
        normalizedPath,
        reason: `Generated output path prefix is blocked: ${blockedPrefix}`,
      };
    }

    return {
      allowed: true,
      normalizedPath,
    };
  }

  public normalizePath(value: string): string {
    return value
      .trim()
      .replaceAll('\\', '/')
      .replace(/^[a-z]:\//iu, '')
      .replace(/^\/+/, '')
      .replace(/^\.\/+/, '')
      .replace(/\/+/g, '/')
      .replace(/\/+$/u, '')
      .toLowerCase();
  }

  private normalizeSegment(value: string): string {
    return value
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase();
  }
}
