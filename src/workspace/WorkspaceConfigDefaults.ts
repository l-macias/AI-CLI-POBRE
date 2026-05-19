import type { WorkspaceConfig } from './WorkspaceConfigTypes.js';

export function createEmptyWorkspaceConfig(): WorkspaceConfig {
  return {
    version: 1,
    currentProjectId: null,
    projects: [],
  };
}
