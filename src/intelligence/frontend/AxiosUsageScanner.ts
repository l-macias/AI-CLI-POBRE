import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export interface AxiosUsage {
  id: string;
  sourceFile: string;
  endpoint: string;
  method: string;
  lineNumber: number;
  raw: string;
}

export interface AxiosUsageScanResult {
  projectRoot: string;
  usages: AxiosUsage[];
  generatedAt: string;
}

export interface AxiosUsageScannerOptions {
  maxFiles?: number | undefined;
  maxDepth?: number | undefined;
}

export class AxiosUsageScanner {
  private readonly maxFiles: number;
  private readonly maxDepth: number;

  public constructor(options: AxiosUsageScannerOptions = {}) {
    this.maxFiles = options.maxFiles ?? 800;
    this.maxDepth = options.maxDepth ?? 8;
  }

  public async scan(projectRoot: string): Promise<AxiosUsageScanResult> {
    const files = await this.walk(projectRoot);
    const usages: AxiosUsage[] = [];

    for (const file of files) {
      const text = await this.readText(path.join(projectRoot, file));

      if (!text || (!text.includes('axios') && !text.includes('api.'))) {
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

  private scanFile(sourceFile: string, text: string): AxiosUsage[] {
    const usages: AxiosUsage[] = [];
    const axiosRegex =
      /(?<client>axios|api)\s*\.\s*(?<method>get|post|put|patch|delete)\s*\(\s*['"`](?<endpoint>[^'"`]+)['"`]/g;

    for (const match of text.matchAll(axiosRegex)) {
      const endpoint = match.groups?.['endpoint'];
      const method = match.groups?.['method'];

      if (!endpoint || !method) {
        continue;
      }

      usages.push({
        id: this.createUsageId(sourceFile, endpoint, match.index ?? 0),
        sourceFile,
        endpoint,
        method: method.toUpperCase(),
        lineNumber: this.lineNumberForIndex(text, match.index ?? 0),
        raw: match[0].trim(),
      });
    }

    return usages;
  }

  private createUsageId(sourceFile: string, endpoint: string, index: number): string {
    const slug = `${sourceFile}-${endpoint}-${index}`
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    return `axios-usage-${slug}`;
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
    return (
      name === 'node_modules' ||
      name === '.git' ||
      name === 'dist' ||
      name === 'build' ||
      name === '.next' ||
      name === '.turbo' ||
      name === 'coverage' ||
      name === '.runtime'
    );
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
