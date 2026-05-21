import type {
  CodeSymbol,
  CodeSymbolKind,
  CodeSymbolScanResult,
} from '../types/CodeIntelligenceTypes.js';
import type { IndexedProjectFile } from '../types/RetrievalTypes.js';

const exportDeclarationPattern =
  /^\s*export\s+(?:declare\s+)?(?:abstract\s+)?(class|interface|type|enum|function|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;

const defaultExportPattern =
  /^\s*export\s+default\s+(?:(?:abstract\s+)?class|async\s+function|function)?\s*([A-Za-z_$][A-Za-z0-9_$]*)?/;

const namedExportPattern = /^\s*export\s*\{([^}]+)\}/;
const namedImportPattern = /^\s*import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"][^'"]+['"]/;

const defaultImportPattern =
  /^\s*import\s+(?:type\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:,\s*|\s+from\s+['"][^'"]+['"])/;

const namespaceImportPattern =
  /^\s*import\s+(?:type\s+)?\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"][^'"]+['"]/;

export class CodeSymbolScanner {
  public scan(file: IndexedProjectFile): CodeSymbolScanResult {
    const lines = file.content.split('\n');
    const exports: CodeSymbol[] = [];
    const imports: CodeSymbol[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const lineNumber = index + 1;

      const exportedDeclaration = this.parseExportDeclaration(file.path, line, lineNumber);

      if (exportedDeclaration) {
        exports.push(exportedDeclaration);
      }

      const defaultExport = this.parseDefaultExport(file.path, line, lineNumber);

      if (defaultExport) {
        exports.push(defaultExport);
      }

      exports.push(...this.parseNamedExports(file.path, line, lineNumber));
      imports.push(...this.parseImports(file.path, line, lineNumber));
    }

    return {
      filePath: file.path,
      exports: this.dedupeSymbols(exports),
      imports: this.dedupeSymbols(imports),
    };
  }

  private parseExportDeclaration(
    filePath: string,
    line: string,
    lineNumber: number,
  ): CodeSymbol | null {
    const match = exportDeclarationPattern.exec(line);
    const kind = match?.[1];
    const name = match?.[2];

    if (!kind || !name) {
      return null;
    }

    return {
      name,
      kind: this.toSymbolKind(kind),
      filePath,
      line: lineNumber,
      sourceText: line.trim(),
    };
  }

  private parseDefaultExport(
    filePath: string,
    line: string,
    lineNumber: number,
  ): CodeSymbol | null {
    const match = defaultExportPattern.exec(line);

    if (!match) {
      return null;
    }

    return {
      name: match[1] ?? 'default',
      kind: 'default',
      filePath,
      line: lineNumber,
      sourceText: line.trim(),
    };
  }

  private parseNamedExports(filePath: string, line: string, lineNumber: number): CodeSymbol[] {
    const match = namedExportPattern.exec(line);
    const body = match?.[1];

    if (!body) {
      return [];
    }

    return body
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => {
        const normalized = item.replace(/^type\s+/, '');
        const parts = normalized.split(/\s+as\s+/);
        const exportedName = parts[1]?.trim() ?? parts[0]?.trim();

        if (!exportedName) {
          return null;
        }

        return {
          name: exportedName,
          kind: 'named_export',
          filePath,
          line: lineNumber,
          sourceText: line.trim(),
        };
      })
      .filter((item): item is CodeSymbol => item !== null);
  }

  private parseImports(filePath: string, line: string, lineNumber: number): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];

    const namespaceImport = namespaceImportPattern.exec(line);

    if (namespaceImport?.[1]) {
      symbols.push({
        name: namespaceImport[1],
        kind: 'namespace_import',
        filePath,
        line: lineNumber,
        sourceText: line.trim(),
      });
    }

    const defaultImport = defaultImportPattern.exec(line);

    if (defaultImport?.[1]) {
      symbols.push({
        name: defaultImport[1],
        kind: 'imported_symbol',
        filePath,
        line: lineNumber,
        sourceText: line.trim(),
      });
    }

    const namedImport = namedImportPattern.exec(line);
    const body = namedImport?.[1];

    if (!body) {
      return symbols;
    }

    const namedSymbols = body
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => item.replace(/^type\s+/, ''))
      .map((item) => {
        const parts = item.split(/\s+as\s+/);
        return parts[1]?.trim() ?? parts[0]?.trim();
      })
      .filter((item): item is string => item !== undefined && item.length > 0)
      .map((name): CodeSymbol => {
        return {
          name,
          kind: 'imported_symbol',
          filePath,
          line: lineNumber,
          sourceText: line.trim(),
        };
      });

    symbols.push(...namedSymbols);

    return symbols;
  }

  private dedupeSymbols(symbols: CodeSymbol[]): CodeSymbol[] {
    const seen = new Set<string>();
    const deduped: CodeSymbol[] = [];

    for (const symbol of symbols) {
      const key = [symbol.filePath, symbol.line, symbol.kind, symbol.name].join('::');

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      deduped.push(symbol);
    }

    return deduped;
  }

  private toSymbolKind(value: string): CodeSymbolKind {
    if (
      value === 'class' ||
      value === 'interface' ||
      value === 'type' ||
      value === 'enum' ||
      value === 'function' ||
      value === 'const' ||
      value === 'let' ||
      value === 'var'
    ) {
      return value;
    }

    return 'named_export';
  }
}
