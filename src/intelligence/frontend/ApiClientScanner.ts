import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { GeneratedPathPolicy } from '../../projects/GeneratedPathPolicy.js';

export interface ApiClientFunction {
  name: string;
  sourceFile: string;
  endpoint?: string | undefined;
  method?: string | undefined;
  lineNumber: number;
  raw: string;
}

export interface ApiClientScanResult {
  projectRoot: string;
  clientFiles: string[];
  functions: ApiClientFunction[];
  generatedAt: string;
}

export interface ApiClientScannerOptions {
  maxFiles?: number | undefined;
  maxDepth?: number | undefined;
}

export class ApiClientScanner {
  private readonly maxFiles: number;
  private readonly maxDepth: number;
  private readonly generatedPathPolicy = new GeneratedPathPolicy();

  public constructor(options: ApiClientScannerOptions = {}) {
    this.maxFiles = options.maxFiles ?? 800;
    this.maxDepth = options.maxDepth ?? 8;
  }

  public async scan(projectRoot: string): Promise<ApiClientScanResult> {
    const files = await this.walk(projectRoot);
    const clientFiles = this.findClientFiles(files);
    const functions: ApiClientFunction[] = [];

    for (const clientFile of clientFiles) {
      const text = await this.readText(path.join(projectRoot, clientFile));

      if (!text) {
        continue;
      }

      functions.push(...this.scanClientFile(clientFile, text));
    }

    return {
      projectRoot,
      clientFiles,
      functions,
      generatedAt: new Date().toISOString(),
    };
  }

  private scanClientFile(sourceFile: string, text: string): ApiClientFunction[] {
    const functions: ApiClientFunction[] = [];

    const functionRegex =
      /export\s+(?:async\s+)?function\s+(?<name>[A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{(?<body>[\s\S]*?)\n\}/g;

    for (const match of text.matchAll(functionRegex)) {
      const name = match.groups?.['name'];
      const body = match.groups?.['body'] ?? '';

      if (!name) {
        continue;
      }

      const endpoint = this.extractEndpoint(body);
      const method = this.extractMethod(body);

      functions.push({
        name,
        sourceFile,
        ...(endpoint ? { endpoint } : {}),
        ...(method ? { method } : {}),
        lineNumber: this.lineNumberForIndex(text, match.index ?? 0),
        raw: match[0].trim(),
      });
    }

    const arrowExportRegex =
      /export\s+const\s+(?<name>[A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{(?<body>[\s\S]*?)\n\}/g;

    for (const match of text.matchAll(arrowExportRegex)) {
      const name = match.groups?.['name'];
      const body = match.groups?.['body'] ?? '';

      if (!name) {
        continue;
      }

      const endpoint = this.extractEndpoint(body);
      const method = this.extractMethod(body);

      functions.push({
        name,
        sourceFile,
        ...(endpoint ? { endpoint } : {}),
        ...(method ? { method } : {}),
        lineNumber: this.lineNumberForIndex(text, match.index ?? 0),
        raw: match[0].trim(),
      });
    }

    return functions;
  }

  private extractEndpoint(text: string): string | undefined {
    const fetchMatch = text.match(/fetch\s*\(\s*['"`](?<endpoint>[^'"`]+)['"`]/);

    if (fetchMatch?.groups?.['endpoint']) {
      return fetchMatch.groups['endpoint'];
    }

    const axiosMatch = text.match(
      /(?:axios|api)\s*\.\s*(?:get|post|put|patch|delete)\s*\(\s*['"`](?<endpoint>[^'"`]+)['"`]/,
    );

    if (axiosMatch?.groups?.['endpoint']) {
      return axiosMatch.groups['endpoint'];
    }

    return undefined;
  }

  private extractMethod(text: string): string | undefined {
    const methodMatch = text.match(/method\s*:\s*['"`](?<method>[A-Za-z]+)['"`]/);

    if (methodMatch?.groups?.['method']) {
      return methodMatch.groups['method'].toUpperCase();
    }

    const axiosMatch = text.match(/(?:axios|api)\s*\.\s*(?<method>get|post|put|patch|delete)\s*\(/);

    if (axiosMatch?.groups?.['method']) {
      return axiosMatch.groups['method'].toUpperCase();
    }

    if (text.includes('fetch(')) {
      return 'GET';
    }

    return undefined;
  }

  private findClientFiles(files: string[]): string[] {
    return files.filter((file) => {
      const normalized = file.toLowerCase();

      return (
        normalized.includes('/api/') ||
        normalized.includes('/client/') ||
        normalized.includes('/services/') ||
        normalized.includes('api.ts') ||
        normalized.includes('api.js') ||
        normalized.includes('client.ts') ||
        normalized.includes('client.js')
      );
    });
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
