import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { GeneratedPathPolicy } from '../../projects/GeneratedPathPolicy.js';
import type { ApiHttpMethod, ApiRouteDefinition, ApiRouteMap } from './ApiRouteMap.js';
import { ControllerResolver } from './ControllerResolver.js';
import { MiddlewareResolver } from './MiddlewareResolver.js';

export interface ExpressRouteScannerOptions {
  maxFiles?: number | undefined;
  maxDepth?: number | undefined;
  controllerResolver?: ControllerResolver | undefined;
  middlewareResolver?: MiddlewareResolver | undefined;
}

export class ExpressRouteScanner {
  private readonly maxFiles: number;
  private readonly maxDepth: number;
  private readonly generatedPathPolicy = new GeneratedPathPolicy();
  private readonly controllerResolver: ControllerResolver;
  private readonly middlewareResolver: MiddlewareResolver;

  public constructor(options: ExpressRouteScannerOptions = {}) {
    this.maxFiles = options.maxFiles ?? 800;
    this.maxDepth = options.maxDepth ?? 8;
    this.controllerResolver = options.controllerResolver ?? new ControllerResolver();
    this.middlewareResolver = options.middlewareResolver ?? new MiddlewareResolver();
  }

  public async scan(projectRoot: string): Promise<ApiRouteMap> {
    const projectFiles = await this.walk(projectRoot);
    const routeFiles = this.findRouteFiles(projectFiles);
    const controllerFiles = this.findControllerFiles(projectFiles);
    const middlewareFiles = this.findMiddlewareFiles(projectFiles);
    const routes: ApiRouteDefinition[] = [];

    for (const routeFile of routeFiles) {
      const absolutePath = path.join(projectRoot, routeFile);
      const sourceText = await this.readText(absolutePath);

      if (!sourceText) {
        continue;
      }

      routes.push(
        ...this.scanRouteFile({
          sourceFile: routeFile,
          sourceText,
          projectFiles,
        }),
      );
    }

    return {
      projectRoot,
      routes,
      routeFiles,
      controllerFiles,
      middlewareFiles,
      generatedAt: new Date().toISOString(),
    };
  }

  private scanRouteFile(input: {
    sourceFile: string;
    sourceText: string;
    projectFiles: string[];
  }): ApiRouteDefinition[] {
    const imports = this.controllerResolver.buildImportMap({
      sourceFile: input.sourceFile,
      sourceText: input.sourceText,
      projectFiles: input.projectFiles,
    });

    const routeRegex =
      /(?<router>[A-Za-z0-9_$]+)\s*\.\s*(?<method>get|post|put|patch|delete|options|head)\s*\(\s*['"`](?<path>[^'"`]+)['"`]\s*,(?<handlers>[^;]+?)\)\s*;?/gs;

    const routes: ApiRouteDefinition[] = [];

    for (const match of input.sourceText.matchAll(routeRegex)) {
      const routerVariable = match.groups?.['router'];
      const rawMethod = match.groups?.['method'];
      const routePath = match.groups?.['path'];
      const handlersRaw = match.groups?.['handlers'];

      if (!routerVariable || !rawMethod || !routePath || !handlersRaw) {
        continue;
      }

      const handlerNames = this.extractHandlerNames(handlersRaw);
      const controllerName = handlerNames.at(-1);
      const middlewareNames = controllerName ? handlerNames.slice(0, -1) : handlerNames;

      routes.push({
        id: this.createRouteId({
          sourceFile: input.sourceFile,
          method: rawMethod,
          routePath,
          lineNumber: this.lineNumberForIndex(input.sourceText, match.index ?? 0),
        }),
        method: this.toHttpMethod(rawMethod),
        path: routePath,
        sourceFile: input.sourceFile,
        routerVariable,
        ...(controllerName
          ? {
              controller: this.controllerResolver.resolveController({
                handlerName: controllerName,
                imports,
              }),
            }
          : {}),
        middlewares: this.middlewareResolver.resolve({
          candidateNames: middlewareNames,
          imports,
        }),
        lineNumber: this.lineNumberForIndex(input.sourceText, match.index ?? 0),
        raw: match[0].trim(),
      });
    }

    return routes;
  }

  private extractHandlerNames(handlersRaw: string): string[] {
    return handlersRaw
      .split(',')
      .map((handler) => handler.trim())
      .map((handler) => handler.replaceAll(/\s+/g, ' '))
      .map((handler) => {
        const arrowMatch = handler.match(/^(?<name>[A-Za-z0-9_$]+)$/);

        if (arrowMatch?.groups?.['name']) {
          return arrowMatch.groups['name'];
        }

        const callMatch = handler.match(/^(?<name>[A-Za-z0-9_$]+)\s*\(/);

        if (callMatch?.groups?.['name']) {
          return callMatch.groups['name'];
        }

        return '';
      })
      .filter((handler) => handler.length > 0);
  }

  private findRouteFiles(files: string[]): string[] {
    return files.filter((file) => {
      const normalized = file.toLowerCase();

      return (
        normalized.includes('/routes/') ||
        normalized.endsWith('routes.ts') ||
        normalized.endsWith('routes.js') ||
        normalized.endsWith('router.ts') ||
        normalized.endsWith('router.js')
      );
    });
  }

  private findControllerFiles(files: string[]): string[] {
    return files.filter((file) => {
      const normalized = file.toLowerCase();

      return normalized.includes('/controllers/') || normalized.includes('controller');
    });
  }

  private findMiddlewareFiles(files: string[]): string[] {
    return files.filter((file) => {
      const normalized = file.toLowerCase();

      return (
        normalized.includes('/middlewares/') ||
        normalized.includes('/middleware/') ||
        normalized.includes('middleware')
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

  private toHttpMethod(method: string): ApiHttpMethod {
    const normalized = method.toUpperCase();

    if (
      normalized === 'GET' ||
      normalized === 'POST' ||
      normalized === 'PUT' ||
      normalized === 'PATCH' ||
      normalized === 'DELETE' ||
      normalized === 'OPTIONS' ||
      normalized === 'HEAD'
    ) {
      return normalized;
    }

    return 'UNKNOWN';
  }

  private lineNumberForIndex(text: string, index: number): number {
    return text.slice(0, index).split('\n').length;
  }

  private createRouteId(input: {
    sourceFile: string;
    method: string;
    routePath: string;
    lineNumber: number;
  }): string {
    const sourceSlug = input.sourceFile
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    const routeSlug = `${input.method}-${input.routePath}`
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    return `api-route-${sourceSlug}-${routeSlug}-${input.lineNumber}`;
  }
}
