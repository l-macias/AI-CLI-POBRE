import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { GeneratedPathPolicy } from '../projects/GeneratedPathPolicy.js';
import { ExpressProfile, type ExpressProfileResult } from './ExpressProfile.js';
import { JavaScriptProfile, type JavaScriptProfileResult } from './JavaScriptProfile.js';
import { MongoProfile, type MongoProfileResult } from './MongoProfile.js';
import { PostgresProfile, type PostgresProfileResult } from './PostgresProfile.js';
import { ReactProfile, type ReactProfileResult } from './ReactProfile.js';
import { TypeScriptProfile, type TypeScriptProfileResult } from './TypeScriptProfile.js';

export interface ProjectStackDetectionResult {
  projectRoot: string;
  stack: string[];
  javascript: JavaScriptProfileResult;
  typescript: TypeScriptProfileResult;
  react: ReactProfileResult;
  express: ExpressProfileResult;
  mongo: MongoProfileResult;
  postgres: PostgresProfileResult;
  detectedFiles: string[];
  generatedAt: string;
}

interface PackageJsonShape {
  type?: string | undefined;
  dependencies?: Record<string, string> | undefined;
  devDependencies?: Record<string, string> | undefined;
}

export interface ProjectStackDetectorOptions {
  maxFiles?: number | undefined;
  maxDepth?: number | undefined;
  javascriptProfile?: JavaScriptProfile | undefined;
  typescriptProfile?: TypeScriptProfile | undefined;
  reactProfile?: ReactProfile | undefined;
  expressProfile?: ExpressProfile | undefined;
  mongoProfile?: MongoProfile | undefined;
  postgresProfile?: PostgresProfile | undefined;
}

export class ProjectStackDetector {
  private readonly maxFiles: number;
  private readonly maxDepth: number;
  private readonly generatedPathPolicy = new GeneratedPathPolicy();
  private readonly javascriptProfile: JavaScriptProfile;
  private readonly typescriptProfile: TypeScriptProfile;
  private readonly reactProfile: ReactProfile;
  private readonly expressProfile: ExpressProfile;
  private readonly mongoProfile: MongoProfile;
  private readonly postgresProfile: PostgresProfile;

  public constructor(options: ProjectStackDetectorOptions = {}) {
    this.maxFiles = options.maxFiles ?? 800;
    this.maxDepth = options.maxDepth ?? 6;
    this.javascriptProfile = options.javascriptProfile ?? new JavaScriptProfile();
    this.typescriptProfile = options.typescriptProfile ?? new TypeScriptProfile();
    this.reactProfile = options.reactProfile ?? new ReactProfile();
    this.expressProfile = options.expressProfile ?? new ExpressProfile();
    this.mongoProfile = options.mongoProfile ?? new MongoProfile();
    this.postgresProfile = options.postgresProfile ?? new PostgresProfile();
  }

  public async detect(projectRoot: string): Promise<ProjectStackDetectionResult> {
    const files = await this.walk(projectRoot);
    const packageJson = await this.readPackageJson(path.join(projectRoot, 'package.json'));
    const tsconfigText = await this.readOptionalText(path.join(projectRoot, 'tsconfig.json'));
    const fileContents = await this.readRelevantContents(projectRoot, files);
    const dependencies = packageJson.dependencies ?? {};
    const devDependencies = packageJson.devDependencies ?? {};

    const javascript = this.javascriptProfile.detect({
      files,
      packageJson,
    });

    const typescript = this.typescriptProfile.detect({
      files,
      tsconfigText: tsconfigText ?? undefined,
    });

    const react = this.reactProfile.detect({
      files,
      dependencies,
      devDependencies,
    });

    const express = this.expressProfile.detect({
      files,
      dependencies,
      fileContents,
    });

    const mongo = this.mongoProfile.detect({
      files,
      dependencies,
      fileContents,
    });

    const postgres = this.postgresProfile.detect({
      files,
      dependencies: {
        ...dependencies,
        ...devDependencies,
      },
      fileContents,
    });

    return {
      projectRoot,
      stack: this.resolveStack({
        javascript,
        typescript,
        react,
        express,
        mongo,
        postgres,
      }),
      javascript,
      typescript,
      react,
      express,
      mongo,
      postgres,
      detectedFiles: files,
      generatedAt: new Date().toISOString(),
    };
  }

  private resolveStack(input: {
    javascript: JavaScriptProfileResult;
    typescript: TypeScriptProfileResult;
    react: ReactProfileResult;
    express: ExpressProfileResult;
    mongo: MongoProfileResult;
    postgres: PostgresProfileResult;
  }): string[] {
    const stack = new Set<string>();

    if (input.javascript.hasJavaScript) {
      stack.add('javascript');
    }

    if (input.typescript.hasTypeScript) {
      stack.add('typescript');
    }

    if (input.react.hasReact) {
      stack.add('react');
    }

    if (input.react.hasVite) {
      stack.add('vite');
    }

    if (input.react.hasNext) {
      stack.add('nextjs');
    }

    if (input.express.hasExpress) {
      stack.add('express');
      stack.add('node');
    }

    if (input.mongo.hasMongo) {
      stack.add('mongodb');
    }

    if (input.mongo.hasMongoose) {
      stack.add('mongoose');
    }

    if (input.postgres.hasPostgres) {
      stack.add('postgresql');
    }

    if (input.postgres.hasPrisma) {
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

  private async walk(projectRoot: string): Promise<string[]> {
    const results: string[] = [];

    await this.walkDirectory({
      root: projectRoot,
      current: projectRoot,
      depth: 0,
      results,
    });

    return results;
  }

  private async walkDirectory(input: {
    root: string;
    current: string;
    depth: number;
    results: string[];
  }): Promise<void> {
    if (input.depth > this.maxDepth || input.results.length >= this.maxFiles) {
      return;
    }

    let entries;

    try {
      entries = await readdir(input.current, {
        withFileTypes: true,
      });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (input.results.length >= this.maxFiles || this.shouldSkip(entry.name)) {
        continue;
      }

      const absolutePath = path.join(input.current, entry.name);
      const relativePath = path.relative(input.root, absolutePath).replaceAll('\\', '/');

      if (this.generatedPathPolicy.isGeneratedPath(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory({
          root: input.root,
          current: absolutePath,
          depth: input.depth + 1,
          results: input.results,
        });

        continue;
      }

      if (entry.isFile() && this.isRelevantFile(relativePath)) {
        input.results.push(relativePath);
      }
    }
  }

  private async readRelevantContents(
    projectRoot: string,
    files: string[],
  ): Promise<Record<string, string>> {
    const contents: Record<string, string> = {};

    for (const file of files) {
      if (!this.shouldReadContent(file)) {
        continue;
      }

      const content = await this.readOptionalText(path.join(projectRoot, file));

      if (content !== null) {
        contents[file] = content.slice(0, 40_000);
      }
    }

    return contents;
  }

  private shouldReadContent(file: string): boolean {
    return (
      file.endsWith('.ts') ||
      file.endsWith('.tsx') ||
      file.endsWith('.js') ||
      file.endsWith('.jsx') ||
      file.endsWith('.prisma') ||
      file.endsWith('.env.example')
    );
  }

  private isRelevantFile(file: string): boolean {
    return (
      file.endsWith('.ts') ||
      file.endsWith('.tsx') ||
      file.endsWith('.js') ||
      file.endsWith('.jsx') ||
      file.endsWith('.json') ||
      file.endsWith('.prisma') ||
      file.endsWith('.env.example')
    );
  }

  private shouldSkip(name: string): boolean {
    return this.generatedPathPolicy.isGeneratedPathSegmentName(name);
  }

  private async readPackageJson(filePath: string): Promise<PackageJsonShape> {
    const text = await this.readOptionalText(filePath);

    if (!text) {
      return {};
    }

    const parsed = JSON.parse(text) as unknown;

    if (!this.isRecord(parsed)) {
      return {};
    }

    return {
      type: typeof parsed['type'] === 'string' ? parsed['type'] : undefined,
      dependencies: this.readDependencyRecord(parsed['dependencies']),
      devDependencies: this.readDependencyRecord(parsed['devDependencies']),
    };
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

  private async readOptionalText(filePath: string): Promise<string | null> {
    try {
      return await readFile(filePath, 'utf8');
    } catch {
      return null;
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
