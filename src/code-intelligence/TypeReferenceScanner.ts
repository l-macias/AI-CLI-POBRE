import type { TypeReference, TypeReferenceScanResult } from '../types/CodeIntelligenceTypes.js';
import type { IndexedProjectFile } from '../types/RetrievalTypes.js';

const typeLikeReferencePattern = /\b[A-Z][A-Za-z0-9_]*(?:<[^>\n]+>)?/g;

const ignoredTypeNames = new Set([
  'Array',
  'Boolean',
  'Date',
  'Error',
  'JSON',
  'Map',
  'Math',
  'NodeJS',
  'Number',
  'Object',
  'Promise',
  'Record',
  'RegExp',
  'Set',
  'String',
  'WeakMap',
  'WeakSet',
  'S',
  'A',
  'Za',
]);

export class TypeReferenceScanner {
  public scan(file: IndexedProjectFile): TypeReferenceScanResult {
    const references: TypeReference[] = [];
    const lines = file.content.split('\n');

    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index] ?? '';
      const line = this.stripInlineNoise(rawLine);
      const lineNumber = index + 1;

      if (line.trim().length === 0) {
        continue;
      }

      for (const match of line.matchAll(typeLikeReferencePattern)) {
        const rawName = match[0];
        const name = this.normalizeName(rawName);

        if (!name || ignoredTypeNames.has(name)) {
          continue;
        }

        references.push({
          name,
          filePath: file.path,
          line: lineNumber,
          sourceText: rawLine.trim(),
        });
      }
    }

    return {
      filePath: file.path,
      references: this.dedupeReferences(references),
    };
  }

  private normalizeName(rawName: string): string | null {
    const genericStartIndex = rawName.indexOf('<');
    const name = genericStartIndex === -1 ? rawName : rawName.slice(0, genericStartIndex);

    if (name.length === 0) {
      return null;
    }

    return name;
  }

  private stripInlineNoise(line: string): string {
    return line
      .replace(/\/\/.*$/u, '')
      .replace(/(['"`])(?:\\.|(?!\1).)*\1/gu, '')
      .replace(/\bnew\s+[A-Z][A-Za-z0-9_]*\b/gu, '');
  }

  private dedupeReferences(references: TypeReference[]): TypeReference[] {
    const seen = new Set<string>();
    const deduped: TypeReference[] = [];

    for (const reference of references) {
      const key = [reference.filePath, reference.line, reference.name, reference.sourceText].join(
        '::',
      );

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      deduped.push(reference);
    }

    return deduped;
  }
}
