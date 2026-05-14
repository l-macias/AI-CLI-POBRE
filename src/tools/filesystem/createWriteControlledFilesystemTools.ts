import type { RuntimeTool } from '../../types/ToolTypes.js';
import { BackupFileTool } from './BackupFileTool.js';
import { CreateFileTool } from './CreateFileTool.js';
import { EditFileTool } from './EditFileTool.js';
import { RestoreCheckpointTool } from './RestoreCheckpointTool.js';

export function createWriteControlledFilesystemTools(): RuntimeTool[] {
  return [
    new CreateFileTool(),
    new EditFileTool(),
    new BackupFileTool(),
    new RestoreCheckpointTool(),
  ];
}
