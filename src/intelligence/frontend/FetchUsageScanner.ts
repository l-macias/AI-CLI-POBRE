import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { GeneratedPathPolicy } from '../../projects/GeneratedPathPolicy.js';

export interface FetchUsage {
  id: string;
  sourceFile: string;
  endpoint: string;
  method: string;
  lineNumber: number;
  raw: string;
}

export interface FetchUsageScanResult {
  projectRoot: string;
  usages: FetchUsage[];
  generatedAt: string;
}

export interface FetchUsageScannerOptions {
  maxFiles?: number | undefined;
  maxDepth?: number | undefined;
}

export class FetchUsageScanner {
  private readonly maxFiles: number;
  private readonly maxDepth: number;
  private readonly generatedPathPolicy = new GeneratedPathPolicy();

  public constructor(options: FetchUsageScannerOptions = {}) {
    this.maxFiles = options.maxFiles ?? 800;
    this.maxDepth = options.maxDepth ?? 8;
  }

  public async scan(projectRoot: string): Promise<FetchUsageScanResult> {
    const files = await this.walk(projectRoot);
    const usages: FetchUsage[] = [];

    for (const file of files) {
      const text = await this.readText(path.join(projectRoot, file));

      if (!text || !text.includes('fetch')) {
        continue;
      }

      usages.push(...this.scanFile(file, text));
    }

    return {
      projectRoot,
      usages,
      generatedAt: new Date().toISOString(),
    };
  }

  private scanFile(sourceFile: string, text: string): FetchUsage[] {
    const usages: FetchUsage[] = [];
    const fetchRegex =
      /fetch\s*\(\s*['"`](?<endpoint>[^'"`]+)['"`]\s*(?:,\s*(?<options>\{[\s\S]*?\}))?\s*\)/g;

    for (const match of text.matchAll(fetchRegex)) {
      const endpoint = match.groups?.['endpoint'];
      const options = match.groups?.['options'] ?? '';

      if (!endpoint) {
        continue;
      }

      usages.push({
        id: this.createUsageId(sourceFile, endpoint, match.index ?? 0),
        sourceFile,
        endpoint,
        method: this.extractMethod(options),
        lineNumber: this.lineNumberForIndex(text, match.index ?? 0),
        raw: match[0].trim(),
      });
    }

    return usages;
  }

  private extractMethod(options: string): string {
    const methodMatch = options.match(/method\s*:\s*['"`](?<method>[A-Za-z]+)['"`]/);

    return methodMatch?.groups?.['method']?.toUpperCase() ?? 'GET';
  }

  private createUsageId(sourceFile: string, endpoint: string, index: number): string {
    const slug = `${sourceFile}-${endpoint}-${index}`
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    return `fetch-usage-${slug}`;
  }

  private async walk(projectRoot: string): Promise<string[]> {
    const results: string[] = [];

    await this.walkDirectory({
      root: projectRoot,
      current: projectRoot,
      depth: 0,
      results,
    });

    return results;
  }

  private async walkDirectory(input: {
    root: string;
    current: string;
    depth: number;
    results: string[];
  }): Promise<void> {
    if (input.depth > this.maxDepth || input.results.length >= this.maxFiles) {
      return;
    }

    let entries;

    try {
      entries = await readdir(input.current, {
        withFileTypes: true,
      });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (input.results.length >= this.maxFiles || this.shouldSkip(entry.name)) {
        continue;
      }

      const absolutePath = path.join(input.current, entry.name);
      const relativePath = path.relative(input.root, absolutePath).replaceAll('\\', '/');

      if (this.generatedPathPolicy.isGeneratedPath(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory({
          root: input.root,
          current: absolutePath,
          depth: input.depth + 1,
          results: input.results,
        });

        continue;
      }

      if (entry.isFile() && this.isRelevantFile(relativePath)) {
        input.results.push(relativePath);
      }
    }
  }

  private isRelevantFile(file: string): boolean {
    return (
      file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')
    );
  }

  private shouldSkip(name: string): boolean {
    return this.generatedPathPolicy.isGeneratedPathSegmentName(name);
  }

  private async readText(filePath: string): Promise<string | null> {
    try {
      return await readFile(filePath, 'utf8');
    } catch {
      return null;
    }
  }

  private lineNumberForIndex(text: string, index: number): number {
    return text.slice(0, index).split('\n').length;
  }
}
