import type { IndexedProjectFile, ProjectChunk } from '../types/RetrievalTypes.js';

export interface ChunkerOptions {
  maxLinesPerChunk?: number | undefined;
  maxCharactersPerChunk?: number | undefined;
}

export class Chunker {
  private readonly maxLinesPerChunk: number;
  private readonly maxCharactersPerChunk: number;

  public constructor(options: ChunkerOptions = {}) {
    this.maxLinesPerChunk = options.maxLinesPerChunk ?? 80;
    this.maxCharactersPerChunk = options.maxCharactersPerChunk ?? 6000;
  }

  public chunkFiles(files: IndexedProjectFile[]): ProjectChunk[] {
    return files.flatMap((file) => this.chunkFile(file));
  }

  public chunkFile(file: IndexedProjectFile): ProjectChunk[] {
    const lines = file.content.split('\n');
    const chunks: ProjectChunk[] = [];

    let startLine = 1;
    let buffer: string[] = [];
    let characterCount = 0;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const nextCharacterCount = characterCount + line.length + 1;

      if (
        buffer.length >= this.maxLinesPerChunk ||
        nextCharacterCount > this.maxCharactersPerChunk
      ) {
        chunks.push(this.createChunk(file.path, startLine, index, buffer));
        startLine = index + 1;
        buffer = [];
        characterCount = 0;
      }

      buffer.push(line);
      characterCount += line.length + 1;
    }

    if (buffer.length > 0) {
      chunks.push(this.createChunk(file.path, startLine, lines.length, buffer));
    }

    return chunks;
  }

  private createChunk(
    filePath: string,
    startLine: number,
    endLine: number,
    lines: string[],
  ): ProjectChunk {
    const content = lines.join('\n');

    return {
      id: `${filePath}:${String(startLine)}-${String(endLine)}`,
      filePath,
      content,
      startLine,
      endLine,
      characterCount: content.length,
    };
  }
}
