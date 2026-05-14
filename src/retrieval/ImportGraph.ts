import path from 'node:path';
import type {
  ImportGraphEdge,
  ImportGraphImport,
  ImportGraphResult,
  IndexedProjectFile,
} from '../types/RetrievalTypes.js';

interface ParsedImportStatement {
  importedPath: string;
  isTypeOnly: boolean;
  specifiers: string[];
}

const importFromPattern = /import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;

const sideEffectImportPattern = /import\s+['"]([^'"]+)['"]/g;

const exportFromPattern = /export\s+(type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;

export class ImportGraph {
  public build(files: IndexedProjectFile[]): ImportGraphResult {
    const fileSet = new Set(files.map((file) => file.path));
    const edges: ImportGraphEdge[] = [];
    const imports: ImportGraphImport[] = [];

    for (const file of files) {
      const parsedImports = this.extractImports(file.content);

      for (const parsedImport of parsedImports) {
        if (!parsedImport.importedPath.startsWith('.')) {
          continue;
        }

        const resolved = this.resolveImport(file.path, parsedImport.importedPath, fileSet);

        const graphImport: ImportGraphImport = {
          sourceFilePath: file.path,
          importedPath: parsedImport.importedPath,
          isTypeOnly: parsedImport.isTypeOnly,
          specifiers: parsedImport.specifiers,
        };

        if (resolved) {
          graphImport.resolvedPath = resolved;

          edges.push({
            from: file.path,
            to: resolved,
            importPath: parsedImport.importedPath,
            isTypeOnly: parsedImport.isTypeOnly,
            specifiers: parsedImport.specifiers,
          });
        }

        imports.push(graphImport);
      }
    }

    return {
      files: [...fileSet],
      edges,
      imports,
    };
  }

  public findImportsForFile(graph: ImportGraphResult, filePath: string): ImportGraphImport[] {
    return graph.imports.filter((item) => item.sourceFilePath === filePath);
  }

  public findImportersOfFile(graph: ImportGraphResult, filePath: string): string[] {
    return graph.edges
      .filter((edge) => edge.to === filePath)
      .map((edge) => edge.from)
      .sort();
  }

  private extractImports(content: string): ParsedImportStatement[] {
    const imports: ParsedImportStatement[] = [];

    for (const match of content.matchAll(importFromPattern)) {
      const typeToken = match[1];
      const importClause = match[2];
      const importedPath = match[3];

      if (!importedPath || importClause === undefined) {
        continue;
      }

      imports.push({
        importedPath,
        isTypeOnly: typeToken !== undefined,
        specifiers: this.extractSpecifiers(importClause),
      });
    }

    for (const match of content.matchAll(sideEffectImportPattern)) {
      const importedPath = match[1];

      if (!importedPath) {
        continue;
      }

      imports.push({
        importedPath,
        isTypeOnly: false,
        specifiers: [],
      });
    }

    for (const match of content.matchAll(exportFromPattern)) {
      const typeToken = match[1];
      const importedPath = match[2];

      if (!importedPath) {
        continue;
      }

      imports.push({
        importedPath,
        isTypeOnly: typeToken !== undefined,
        specifiers: [],
      });
    }

    return this.dedupeImports(imports);
  }

  private extractSpecifiers(importClause: string): string[] {
    const trimmed = importClause.trim();

    if (trimmed.length === 0) {
      return [];
    }

    const namedImportMatch = /\{([^}]+)\}/.exec(trimmed);
    const specifiers: string[] = [];

    if (namedImportMatch?.[1]) {
      const namedSpecifiers = namedImportMatch[1]
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .map((item) => item.replace(/^type\s+/, ''));

      specifiers.push(...namedSpecifiers);
    }

    const defaultImportMatch = /^([A-Za-z_$][A-Za-z0-9_$]*)/.exec(trimmed);

    if (defaultImportMatch?.[1] && !trimmed.startsWith('{') && !trimmed.startsWith('*')) {
      specifiers.push(defaultImportMatch[1]);
    }

    const namespaceImportMatch = /\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/.exec(trimmed);

    if (namespaceImportMatch?.[1]) {
      specifiers.push(namespaceImportMatch[1]);
    }

    return [...new Set(specifiers)].sort();
  }

  private dedupeImports(imports: ParsedImportStatement[]): ParsedImportStatement[] {
    const seen = new Set<string>();
    const deduped: ParsedImportStatement[] = [];

    for (const item of imports) {
      const key = [item.importedPath, String(item.isTypeOnly), item.specifiers.join('|')].join(
        '::',
      );

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      deduped.push(item);
    }

    return deduped;
  }

  private resolveImport(
    fromFile: string,
    importedPath: string,
    fileSet: Set<string>,
  ): string | null {
    const baseDirectory = path.dirname(fromFile);
    const withoutJsExtension = importedPath.endsWith('.js')
      ? importedPath.slice(0, -3)
      : importedPath;

    const normalizedBase = path.join(baseDirectory, withoutJsExtension).replaceAll('\\', '/');
    const normalizedOriginal = path.join(baseDirectory, importedPath).replaceAll('\\', '/');

    const candidates = [
      normalizedBase,
      `${normalizedBase}.ts`,
      `${normalizedBase}.tsx`,
      `${normalizedBase}.js`,
      `${normalizedBase}.jsx`,
      `${normalizedBase}/index.ts`,
      `${normalizedBase}/index.tsx`,
      normalizedOriginal,
    ];

    return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
  }
}
