import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { ProjectPackageManager, ProjectStack } from './ProjectProfile.js';

interface PackageJsonShape {
  dependencies?: Record<string, string> | undefined;
  devDependencies?: Record<string, string> | undefined;
}

export interface ProjectDetectionResult {
  stack: ProjectStack[];
  packageManager: ProjectPackageManager;
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasSrcDirectory: boolean;
  hasPrismaSchema: boolean;
}

export class ProjectDetector {
  public async detect(rootPath: string): Promise<ProjectDetectionResult> {
    const entries = await this.safeReadDirectory(rootPath);
    const packageJson = await this.safeReadPackageJson(path.join(rootPath, 'package.json'));
    const prismaSchemaPath = path.join(rootPath, 'prisma', 'schema.prisma');
    const prismaSchema = await this.safeReadText(prismaSchemaPath);

    const hasPackageJson = entries.includes('package.json');
    const hasTsConfig = entries.includes('tsconfig.json');
    const hasSrcDirectory = await this.isDirectory(path.join(rootPath, 'src'));
    const hasPrismaSchema = prismaSchema !== null;

    return {
      stack: this.resolveStack({
        entries,
        packageJson,
        hasTsConfig,
        hasPrismaSchema,
        prismaSchema,
      }),
      packageManager: this.resolvePackageManager(entries),
      hasPackageJson,
      hasTsConfig,
      hasSrcDirectory,
      hasPrismaSchema,
    };
  }

  private resolveStack(input: {
    entries: string[];
    packageJson: PackageJsonShape | null;
    hasTsConfig: boolean;
    hasPrismaSchema: boolean;
    prismaSchema: string | null;
  }): ProjectStack[] {
    const stack = new Set<ProjectStack>();
    const dependencies = {
      ...(input.packageJson?.dependencies ?? {}),
      ...(input.packageJson?.devDependencies ?? {}),
    };

    if (input.entries.includes('package.json')) {
      stack.add('node');
    }

    if (input.hasTsConfig || 'typescript' in dependencies) {
      stack.add('typescript');
    }

    if (!input.hasTsConfig && input.entries.includes('package.json')) {
      stack.add('javascript');
    }

    if ('react' in dependencies) {
      stack.add('react');
    }

    if ('next' in dependencies) {
      stack.add('nextjs');
      stack.add('react');
    }

    if ('vite' in dependencies || input.entries.includes('vite.config.ts')) {
      stack.add('vite');
    }

    if ('express' in dependencies) {
      stack.add('express');
    }

    if ('mongodb' in dependencies || 'mongoose' in dependencies) {
      stack.add('mongodb');
    }

    if (
      'pg' in dependencies ||
      'postgres' in dependencies ||
      this.prismaUsesPostgres(input.prismaSchema)
    ) {
      stack.add('postgresql');
    }

    if ('prisma' in dependencies || '@prisma/client' in dependencies || input.hasPrismaSchema) {
      stack.add('prisma');
    }

    if (stack.has('react') && stack.has('express') && stack.has('mongodb')) {
      stack.add('mern');
    }

    if (stack.has('react') && stack.has('express') && stack.has('postgresql')) {
      stack.add('pern');
    }

    if (stack.size === 0) {
      stack.add('unknown');
    }

    return [...stack].sort();
  }

  private prismaUsesPostgres(schema: string | null): boolean {
    if (!schema) {
      return false;
    }

    return schema.includes('provider = "postgresql"') || schema.includes("provider = 'postgresql'");
  }

  private resolvePackageManager(entries: string[]): ProjectPackageManager {
    if (entries.includes('pnpm-lock.yaml')) {
      return 'pnpm';
    }

    if (entries.includes('yarn.lock')) {
      return 'yarn';
    }

    if (entries.includes('bun.lockb')) {
      return 'bun';
    }

    if (entries.includes('package-lock.json')) {
      return 'npm';
    }

    if (entries.includes('package.json')) {
      return 'npm';
    }

    return 'unknown';
  }

  private async safeReadDirectory(rootPath: string): Promise<string[]> {
    try {
      return await readdir(rootPath);
    } catch {
      return [];
    }
  }

  private async safeReadPackageJson(filePath: string): Promise<PackageJsonShape | null> {
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed: unknown = JSON.parse(content);

      if (!this.isRecord(parsed)) {
        return null;
      }

      return {
        dependencies: this.readDependencyRecord(parsed['dependencies']),
        devDependencies: this.readDependencyRecord(parsed['devDependencies']),
      };
    } catch {
      return null;
    }
  }

  private readDependencyRecord(value: unknown): Record<string, string> | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const entries = Object.entries(value).filter((entry): entry is [string, string] => {
      return typeof entry[1] === 'string';
    });

    return Object.fromEntries(entries);
  }

  private async safeReadText(filePath: string): Promise<string | null> {
    try {
      return await readFile(filePath, 'utf8');
    } catch {
      return null;
    }
  }

  private async isDirectory(targetPath: string): Promise<boolean> {
    try {
      const result = await stat(targetPath);

      return result.isDirectory();
    } catch {
      return false;
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
