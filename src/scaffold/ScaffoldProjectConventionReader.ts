import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScaffoldProjectConvention } from './ScaffoldTypes.js';

export interface ScaffoldProjectConventionReaderInput {
  projectRoot: string;
}

export class ScaffoldProjectConventionReader {
  public async read(
    input: ScaffoldProjectConventionReaderInput,
  ): Promise<ScaffoldProjectConvention> {
    const hasPackageJson = await this.exists(join(input.projectRoot, 'package.json'));
    const hasTsConfig = await this.exists(join(input.projectRoot, 'tsconfig.json'));
    const hasSrcDirectory = await this.exists(join(input.projectRoot, 'src'));
    const packageJson = hasPackageJson
      ? await this.readPackageJson(join(input.projectRoot, 'package.json'))
      : undefined;

    const packageManager = await this.detectPackageManager(input.projectRoot);
    const detectedStack = this.detectStack({
      projectRoot: input.projectRoot,
      hasPackageJson,
      hasTsConfig,
      packageJson,
    });

    const preferredSourceRoot = hasSrcDirectory ? 'src' : '.';
    const moduleRootHint = await this.detectModuleRoot({
      projectRoot: input.projectRoot,
      preferredSourceRoot,
    });
    const testRootHint = await this.detectTestRoot(input.projectRoot);

    return {
      projectRoot: input.projectRoot,
      detectedStack,
      packageManager,
      hasTypeScript: hasTsConfig || detectedStack.includes('typescript'),
      hasSrcDirectory,
      hasPackageJson,
      hasTsConfig,
      preferredSourceRoot,
      moduleRootHint,
      testRootHint,
    };
  }

  private async exists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private async readPackageJson(targetPath: string): Promise<Record<string, unknown> | undefined> {
    try {
      const raw = await readFile(targetPath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return undefined;
      }

      return parsed as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  private async detectPackageManager(
    projectRoot: string,
  ): Promise<ScaffoldProjectConvention['packageManager']> {
    if (await this.exists(join(projectRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }

    if (await this.exists(join(projectRoot, 'yarn.lock'))) {
      return 'yarn';
    }

    if (await this.exists(join(projectRoot, 'package-lock.json'))) {
      return 'npm';
    }

    return 'unknown';
  }

  private detectStack(input: {
    projectRoot: string;
    hasPackageJson: boolean;
    hasTsConfig: boolean;
    packageJson?: Record<string, unknown> | undefined;
  }): string[] {
    const stack = new Set<string>();

    if (input.hasPackageJson) {
      stack.add('node');
    }

    if (input.hasTsConfig) {
      stack.add('typescript');
    }

    const dependencies = {
      ...this.readDependencyRecord(input.packageJson?.['dependencies']),
      ...this.readDependencyRecord(input.packageJson?.['devDependencies']),
    };

    if (Object.prototype.hasOwnProperty.call(dependencies, 'react')) {
      stack.add('react');
    }

    if (Object.prototype.hasOwnProperty.call(dependencies, 'next')) {
      stack.add('next');
    }

    if (Object.prototype.hasOwnProperty.call(dependencies, 'express')) {
      stack.add('express');
    }

    if (Object.prototype.hasOwnProperty.call(dependencies, 'fastify')) {
      stack.add('fastify');
    }

    if (Object.prototype.hasOwnProperty.call(dependencies, 'vite')) {
      stack.add('vite');
    }

    if (Object.prototype.hasOwnProperty.call(dependencies, 'vitest')) {
      stack.add('vitest');
    }

    if (Object.prototype.hasOwnProperty.call(dependencies, 'jest')) {
      stack.add('jest');
    }

    return [...stack].sort();
  }

  private readDependencyRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private async detectModuleRoot(input: {
    projectRoot: string;
    preferredSourceRoot: string;
  }): Promise<string | undefined> {
    const candidates = [
      join(input.projectRoot, input.preferredSourceRoot, 'modules'),
      join(input.projectRoot, input.preferredSourceRoot, 'features'),
      join(input.projectRoot, input.preferredSourceRoot, 'app'),
      join(input.projectRoot, input.preferredSourceRoot, 'components'),
    ];

    for (const candidate of candidates) {
      if (await this.exists(candidate)) {
        return this.toRelativeProjectPath(input.projectRoot, candidate);
      }
    }

    if (input.preferredSourceRoot !== '.') {
      return input.preferredSourceRoot;
    }

    return undefined;
  }

  private async detectTestRoot(projectRoot: string): Promise<string | undefined> {
    const entries = await this.safeReadDir(projectRoot);

    if (entries.includes('tests')) {
      return 'tests';
    }

    if (entries.includes('__tests__')) {
      return '__tests__';
    }

    if (await this.exists(join(projectRoot, 'src', '__tests__'))) {
      return 'src/__tests__';
    }

    return undefined;
  }

  private async safeReadDir(targetPath: string): Promise<string[]> {
    try {
      return await readdir(targetPath);
    } catch {
      return [];
    }
  }

  private toRelativeProjectPath(projectRoot: string, absolutePath: string): string {
    return absolutePath.slice(projectRoot.length).replaceAll('\\', '/').replace(/^\/+/, '');
  }
}
