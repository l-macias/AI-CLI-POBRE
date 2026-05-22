export type ProjectStack =
  | 'mern'
  | 'pern'
  | 'react'
  | 'express'
  | 'node'
  | 'typescript'
  | 'javascript'
  | 'mongodb'
  | 'postgresql'
  | 'prisma'
  | 'vite'
  | 'nextjs'
  | 'unknown';

export type ProjectPackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';

export type ProjectWorkingMode =
  | 'local_patchless'
  | 'local_snapshot'
  | 'git_diff'
  | 'git_branch_pr';

export interface ProjectProfile {
  id: string;
  name: string;
  rootPath: string;
  stack: ProjectStack[];
  packageManager: ProjectPackageManager;
  workingMode: ProjectWorkingMode;
  gitRequired: boolean;
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasSrcDirectory: boolean;
  hasPrismaSchema: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRegistryState {
  version: 1;
  currentProjectId: string | null;
  projects: ProjectProfile[];
}

export interface ProjectScanResult {
  profile: ProjectProfile;
  configPath: string;
}

export interface ProjectConfigFile {
  version: 1;
  id: string;
  name: string;
  rootPath: string;
  stack: ProjectStack[];
  packageManager: ProjectPackageManager;
  workingMode: ProjectWorkingMode;
  gitRequired: boolean;
  updatedAt: string;
}
