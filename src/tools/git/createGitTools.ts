import type { RuntimeTool } from '../../types/ToolTypes.js';
import { GitCheckpointTool } from './GitCheckpointTool.js';
import { GitDiffTool } from './GitDiffTool.js';
import { GitRestoreTool } from './GitRestoreTool.js';
import { GitStatusTool } from './GitStatusTool.js';

export function createGitTools(): RuntimeTool[] {
  return [new GitStatusTool(), new GitDiffTool(), new GitCheckpointTool(), new GitRestoreTool()];
}
