import path from 'node:path';
import type {
  ImportGraphEdge,
  ImportGraphResult,
  IndexedProjectFile,
} from '../types/RetrievalTypes.js';

const importPattern = /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

export class ImportGraph {
  public build(files: IndexedProjectFile[]): ImportGraphResult {
    const fileSet = new Set(files.map((file) => file.path));
    const edges: ImportGraphEdge[] = [];

    for (const file of files) {
      const imports = this.extractImports(file.content);

      for (const importedPath of imports) {
        const resolved = this.resolveImport(file.path, importedPath, fileSet);

        if (resolved) {
          edges.push({
            from: file.path,
            to: resolved,
          });
        }
      }
    }

    return {
      files: [...fileSet],
      edges,
    };
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];

    for (const match of content.matchAll(importPattern)) {
      const importedPath = match[1];

      if (importedPath && importedPath.startsWith('.')) {
        imports.push(importedPath);
      }
    }

    return imports;
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

    const candidates = [
      path.join(baseDirectory, withoutJsExtension).replaceAll('\\', '/'),
      `${path.join(baseDirectory, withoutJsExtension).replaceAll('\\', '/')}.ts`,
      `${path.join(baseDirectory, withoutJsExtension).replaceAll('\\', '/')}.tsx`,
      `${path.join(baseDirectory, importedPath).replaceAll('\\', '/')}`,
    ];

    return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
  }
}
