import path from 'node:path';
import type { ApiRouteControllerRef } from './ApiRouteMap.js';

export interface ControllerImportMap {
  [localName: string]: {
    importPath: string;
    resolvedFile?: string | undefined;
  };
}

export class ControllerResolver {
  public buildImportMap(input: {
    sourceFile: string;
    sourceText: string;
    projectFiles: string[];
  }): ControllerImportMap {
    const imports: ControllerImportMap = {};
    const importRegex =
      /import\s+(?:\{(?<named>[^}]+)\}|(?<defaultName>[A-Za-z0-9_$]+))\s+from\s+['"](?<importPath>[^'"]+)['"]/g;

    for (const match of input.sourceText.matchAll(importRegex)) {
      const importPath = match.groups?.['importPath'];

      if (!importPath) {
        continue;
      }

      const resolvedFile = this.resolveImportFile({
        sourceFile: input.sourceFile,
        importPath,
        projectFiles: input.projectFiles,
      });

      const defaultName = match.groups?.['defaultName'];

      if (defaultName) {
        imports[defaultName] = {
          importPath,
          ...(resolvedFile ? { resolvedFile } : {}),
        };
      }

      const named = match.groups?.['named'];

      if (named) {
        for (const name of this.parseNamedImports(named)) {
          imports[name] = {
            importPath,
            ...(resolvedFile ? { resolvedFile } : {}),
          };
        }
      }
    }

    return imports;
  }

  public resolveController(input: {
    handlerName: string;
    imports: ControllerImportMap;
  }): ApiRouteControllerRef {
    const imported = input.imports[input.handlerName];

    return {
      name: input.handlerName,
      ...(imported?.importPath ? { importPath: imported.importPath } : {}),
      ...(imported?.resolvedFile ? { resolvedFile: imported.resolvedFile } : {}),
    };
  }

  private parseNamedImports(named: string): string[] {
    return named
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => {
        const [original, alias] = item.split(/\s+as\s+/);

        return (alias ?? original ?? '').trim();
      })
      .filter((item) => item.length > 0);
  }

  private resolveImportFile(input: {
    sourceFile: string;
    importPath: string;
    projectFiles: string[];
  }): string | undefined {
    if (!input.importPath.startsWith('.')) {
      return undefined;
    }

    const sourceDir = path.dirname(input.sourceFile);
    const candidateBase = path
      .normalize(path.join(sourceDir, input.importPath))
      .replaceAll('\\', '/');

    const candidates = [
      candidateBase,
      `${candidateBase}.ts`,
      `${candidateBase}.tsx`,
      `${candidateBase}.js`,
      `${candidateBase}.jsx`,
      `${candidateBase}/index.ts`,
      `${candidateBase}/index.tsx`,
      `${candidateBase}/index.js`,
      `${candidateBase}/index.jsx`,
    ];

    return candidates.find((candidate) => input.projectFiles.includes(candidate));
  }
}
