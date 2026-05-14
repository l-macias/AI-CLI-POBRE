import type { RuntimeTool } from '../../types/ToolTypes.js';
import { DiffFileTool } from './DiffFileTool.js';
import { ListDirectoryTool } from './ListDirectoryTool.js';
import { ReadFileTool } from './ReadFileTool.js';
import { SearchFilesTool } from './SearchFilesTool.js';

export function createReadOnlyFilesystemTools(): RuntimeTool[] {
  return [new ReadFileTool(), new ListDirectoryTool(), new SearchFilesTool(), new DiffFileTool()];
}
