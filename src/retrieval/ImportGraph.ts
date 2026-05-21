import path from 'node:path';
import type {
  ImportGraphEdge,
  ImportGraphImport,
  ImportGraphImportKind,
  ImportGraphResult,
  IndexedProjectFile,
} from '../types/RetrievalTypes.js';

interface ParsedImportStatement {
  importedPath: string;
  isTypeOnly: boolean;
  specifiers: string[];
  importKind: ImportGraphImportKind;
}

const importFromPattern = /import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
const sideEffectImportPattern = /import\s+['"]([^'"]+)['"]/g;
const exportFromPattern = /export\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
const dynamicImportPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

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
          importKind: parsedImport.importKind,
        };

        if (resolved) {
          graphImport.resolvedPath = resolved;

          edges.push({
            from: file.path,
            to: resolved,
            importPath: parsedImport.importedPath,
            isTypeOnly: parsedImport.isTypeOnly,
            specifiers: parsedImport.specifiers,
            importKind: parsedImport.importKind,
          });
        }

        imports.push(graphImport);
      }
    }

    return {
      files: [...fileSet].sort(),
      edges: this.dedupeEdges(edges),
      imports: this.dedupeGraphImports(imports),
    };
  }

  public findImportsForFile(graph: ImportGraphResult, filePath: string): ImportGraphImport[] {
    return graph.imports
      .filter((item) => item.sourceFilePath === filePath)
      .sort((left, right) => left.importedPath.localeCompare(right.importedPath));
  }

  public findImportersOfFile(graph: ImportGraphResult, filePath: string): string[] {
    return [
      ...new Set(graph.edges.filter((edge) => edge.to === filePath).map((edge) => edge.from)),
    ].sort();
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
        importKind: 'static_import',
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
        importKind: 'side_effect_import',
      });
    }

    for (const match of content.matchAll(exportFromPattern)) {
      const typeToken = match[1];
      const exportClause = match[2];
      const importedPath = match[3];

      if (!importedPath) {
        continue;
      }

      imports.push({
        importedPath,
        isTypeOnly: typeToken !== undefined,
        specifiers: exportClause ? this.extractSpecifiers(exportClause) : [],
        importKind: 're_export',
      });
    }

    for (const match of content.matchAll(dynamicImportPattern)) {
      const importedPath = match[1];

      if (!importedPath) {
        continue;
      }

      imports.push({
        importedPath,
        isTypeOnly: false,
        specifiers: [],
        importKind: 'dynamic_import',
      });
    }

    return this.dedupeImports(imports);
  }

  private extractSpecifiers(importClause: string): string[] {
    const trimmed = importClause.trim();

    if (trimmed.length === 0 || trimmed === '*') {
      return [];
    }

    const namedImportMatch = /\{([^}]+)\}/.exec(trimmed);
    const specifiers: string[] = [];

    if (namedImportMatch?.[1]) {
      const namedSpecifiers = namedImportMatch[1]
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .map((item) => item.replace(/^type\s+/, ''))
        .map((item) => {
          const [importedName] = item.split(/\s+as\s+/);
          return importedName?.trim();
        })
        .filter((item): item is string => item !== undefined && item.length > 0);

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
      const key = [
        item.importedPath,
        String(item.isTypeOnly),
        item.importKind,
        item.specifiers.join('|'),
      ].join('::');

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      deduped.push(item);
    }

    return deduped;
  }

  private dedupeEdges(edges: ImportGraphEdge[]): ImportGraphEdge[] {
    const seen = new Set<string>();
    const deduped: ImportGraphEdge[] = [];

    for (const edge of edges) {
      const key = [
        edge.from,
        edge.to,
        edge.importPath ?? '',
        String(edge.isTypeOnly ?? false),
        edge.importKind ?? '',
        edge.specifiers?.join('|') ?? '',
      ].join('::');

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      deduped.push(edge);
    }

    return deduped.sort((left, right) => {
      const fromComparison = left.from.localeCompare(right.from);

      if (fromComparison !== 0) {
        return fromComparison;
      }

      return left.to.localeCompare(right.to);
    });
  }

  private dedupeGraphImports(imports: ImportGraphImport[]): ImportGraphImport[] {
    const seen = new Set<string>();
    const deduped: ImportGraphImport[] = [];

    for (const item of imports) {
      const key = [
        item.sourceFilePath,
        item.importedPath,
        item.resolvedPath ?? '',
        String(item.isTypeOnly),
        item.importKind,
        item.specifiers.join('|'),
      ].join('::');

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      deduped.push(item);
    }

    return deduped.sort((left, right) => {
      const sourceComparison = left.sourceFilePath.localeCompare(right.sourceFilePath);

      if (sourceComparison !== 0) {
        return sourceComparison;
      }

      return left.importedPath.localeCompare(right.importedPath);
    });
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
      `${normalizedBase}.d.ts`,
      `${normalizedBase}.mts`,
      `${normalizedBase}.cts`,
      `${normalizedBase}/index.ts`,
      `${normalizedBase}/index.tsx`,
      `${normalizedBase}/index.js`,
      `${normalizedBase}/index.jsx`,
      `${normalizedBase}/index.d.ts`,
      normalizedOriginal,
    ];

    return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
  }
}
