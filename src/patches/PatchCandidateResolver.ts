import type { Dirent } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { GeneratedPathPolicy } from '../projects/GeneratedPathPolicy.js';
import type { RuntimePlanCandidateFile } from '../planning/RuntimePlan.js';

const defaultExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json', '.md']);

export interface PatchCandidateInput extends RuntimePlanCandidateFile {
  content?: string | undefined;
}

export interface ResolvedPatchCandidate {
  path: string;
  content: string;
  existsKnown: boolean;
  reason: string;
}

export interface PatchCandidateResolverInput {
  projectRoot: string;
  candidates: PatchCandidateInput[];
  maxFiles?: number | undefined;
  maxFileBytes?: number | undefined;
}

export class PatchCandidateResolver {
  private readonly generatedPathPolicy = new GeneratedPathPolicy();

  public async resolve(input: PatchCandidateResolverInput): Promise<ResolvedPatchCandidate[]> {
    const maxFiles = input.maxFiles ?? 12;
    const maxFileBytes = input.maxFileBytes ?? 80_000;
    const resolved: ResolvedPatchCandidate[] = [];

    for (const candidate of input.candidates) {
      if (resolved.length >= maxFiles) {
        break;
      }

      const discovered = await this.discoverCandidate({
        projectRoot: input.projectRoot,
        candidate,
        maxFiles: maxFiles - resolved.length,
        maxFileBytes,
      });

      resolved.push(...discovered);
    }

    return this.dedupe(resolved).slice(0, maxFiles);
  }

  private async discoverCandidate(input: {
    projectRoot: string;
    candidate: PatchCandidateInput;
    maxFiles: number;
    maxFileBytes: number;
  }): Promise<ResolvedPatchCandidate[]> {
    const normalizedPath = this.normalizeCandidatePath(input.candidate.path);

    if (
      !normalizedPath ||
      this.generatedPathPolicy.isGeneratedPath(normalizedPath) ||
      this.isProtectedPath(normalizedPath)
    ) {
      return [];
    }

    if (input.candidate.content !== undefined && this.isPatchableFile(normalizedPath)) {
      return [
        {
          path: normalizedPath,
          content: input.candidate.content,
          existsKnown: input.candidate.existsKnown,
          reason: input.candidate.reason,
        },
      ];
    }

    if (this.looksLikeGlob(normalizedPath)) {
      return this.discoverGlobLikeCandidate({
        projectRoot: input.projectRoot,
        candidate: input.candidate,
        normalizedPath,
        maxFiles: input.maxFiles,
        maxFileBytes: input.maxFileBytes,
      });
    }

    const absolutePath = path.join(input.projectRoot, normalizedPath);

    if (!this.isInsideProject(input.projectRoot, absolutePath)) {
      return [];
    }

    try {
      const stats = await stat(absolutePath);

      if (stats.isDirectory()) {
        return this.discoverDirectory({
          projectRoot: input.projectRoot,
          relativePath: normalizedPath,
          reason: input.candidate.reason,
          maxFiles: input.maxFiles,
          maxFileBytes: input.maxFileBytes,
        });
      }

      if (stats.isFile()) {
        const file = await this.readSafeFile({
          projectRoot: input.projectRoot,
          relativePath: normalizedPath,
          reason: input.candidate.reason,
          maxFileBytes: input.maxFileBytes,
        });

        return file ? [file] : [];
      }

      return [];
    } catch {
      return [];
    }
  }

  private async discoverGlobLikeCandidate(input: {
    projectRoot: string;
    candidate: PatchCandidateInput;
    normalizedPath: string;
    maxFiles: number;
    maxFileBytes: number;
  }): Promise<ResolvedPatchCandidate[]> {
    const baseDirectory = this.extractGlobBaseDirectory(input.normalizedPath);

    if (
      !baseDirectory ||
      this.generatedPathPolicy.isGeneratedPath(baseDirectory) ||
      this.isProtectedPath(baseDirectory)
    ) {
      return [];
    }

    return this.discoverDirectory({
      projectRoot: input.projectRoot,
      relativePath: baseDirectory,
      reason: input.candidate.reason,
      maxFiles: input.maxFiles,
      maxFileBytes: input.maxFileBytes,
    });
  }

  private async discoverDirectory(input: {
    projectRoot: string;
    relativePath: string;
    reason: string;
    maxFiles: number;
    maxFileBytes: number;
  }): Promise<ResolvedPatchCandidate[]> {
    const files = await this.walkDirectory({
      projectRoot: input.projectRoot,
      relativePath: input.relativePath,
      maxFilesToScan: 80,
    });

    const rankedFiles = files
      .filter((file) => this.isPatchableFile(file))
      .sort((left, right) => this.scoreFile(right) - this.scoreFile(left))
      .slice(0, input.maxFiles);

    const resolved: ResolvedPatchCandidate[] = [];

    for (const file of rankedFiles) {
      const candidate = await this.readSafeFile({
        projectRoot: input.projectRoot,
        relativePath: file,
        reason: input.reason,
        maxFileBytes: input.maxFileBytes,
      });

      if (candidate) {
        resolved.push(candidate);
      }
    }

    return resolved;
  }

  private async walkDirectory(input: {
    projectRoot: string;
    relativePath: string;
    maxFilesToScan: number;
  }): Promise<string[]> {
    const absoluteDirectory = path.join(input.projectRoot, input.relativePath);

    if (!this.isInsideProject(input.projectRoot, absoluteDirectory)) {
      return [];
    }

    const pending = [input.relativePath];
    const files: string[] = [];

    while (pending.length > 0 && files.length < input.maxFilesToScan) {
      const current = pending.shift();

      if (
        !current ||
        this.generatedPathPolicy.isGeneratedPath(current) ||
        this.isProtectedPath(current)
      ) {
        continue;
      }

      const absoluteCurrent = path.join(input.projectRoot, current);

      let entries: Dirent[];

      try {
        entries = await readdir(absoluteCurrent, {
          withFileTypes: true,
          encoding: 'utf8',
        });
      } catch {
        continue;
      }

      for (const entry of entries) {
        const relativeEntryPath = path.posix.join(current.replaceAll('\\', '/'), entry.name);

        if (
          this.generatedPathPolicy.isGeneratedPath(relativeEntryPath) ||
          this.isProtectedPath(relativeEntryPath)
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          pending.push(relativeEntryPath);
          continue;
        }

        if (entry.isFile()) {
          files.push(relativeEntryPath);
        }

        if (files.length >= input.maxFilesToScan) {
          break;
        }
      }
    }

    return files;
  }

  private async readSafeFile(input: {
    projectRoot: string;
    relativePath: string;
    reason: string;
    maxFileBytes: number;
  }): Promise<ResolvedPatchCandidate | null> {
    if (this.generatedPathPolicy.isGeneratedPath(input.relativePath)) {
      return null;
    }

    if (!this.isPatchableFile(input.relativePath)) {
      return null;
    }

    const absolutePath = path.join(input.projectRoot, input.relativePath);

    if (!this.isInsideProject(input.projectRoot, absolutePath)) {
      return null;
    }

    const stats = await stat(absolutePath);

    if (!stats.isFile() || stats.size > input.maxFileBytes) {
      return null;
    }

    const content = await readFile(absolutePath, 'utf8');

    return {
      path: input.relativePath.replaceAll('\\', '/'),
      content,
      existsKnown: true,
      reason: input.reason,
    };
  }

  private normalizeCandidatePath(value: string): string {
    return value
      .trim()
      .replaceAll('\\', '/')
      .replace(/^[a-z]:\//iu, '')
      .replace(/^\/+/, '')
      .replace(/^\.\/+/, '');
  }

  private looksLikeGlob(value: string): boolean {
    return value.includes('*');
  }

  private extractGlobBaseDirectory(value: string): string | null {
    const wildcardIndex = value.indexOf('*');

    if (wildcardIndex < 0) {
      return null;
    }

    const beforeWildcard = value.slice(0, wildcardIndex);
    const lastSlash = beforeWildcard.lastIndexOf('/');

    if (lastSlash < 0) {
      return '.';
    }

    return beforeWildcard.slice(0, lastSlash).replace(/\/+$/u, '') || '.';
  }

  private isPatchableFile(relativePath: string): boolean {
    const normalized = relativePath.replaceAll('\\', '/');

    if (this.generatedPathPolicy.isGeneratedPath(normalized)) {
      return false;
    }

    if (this.isProtectedPath(normalized)) {
      return false;
    }

    if (this.isDatabaseSensitivePath(normalized)) {
      return false;
    }

    const lowered = normalized.toLowerCase();

    if (lowered.endsWith('.module.css')) {
      return true;
    }

    if (lowered.endsWith('.module.scss')) {
      return true;
    }

    return defaultExtensions.has(path.extname(lowered));
  }

  private isProtectedPath(relativePath: string): boolean {
    const normalized = relativePath.toLowerCase().replaceAll('\\', '/');
    const segments = normalized.split('/');

    if (this.generatedPathPolicy.isGeneratedPath(relativePath)) {
      return true;
    }

    if (normalized.startsWith('.env') || normalized.includes('/.env')) {
      return true;
    }

    return (
      segments.includes('.git') ||
      segments.includes('node_modules') ||
      segments.includes('dist') ||
      segments.includes('build') ||
      segments.includes('out') ||
      segments.includes('.next') ||
      segments.includes('.open-next') ||
      segments.includes('.cache') ||
      segments.includes('.turbo') ||
      segments.includes('.vercel') ||
      segments.includes('coverage')
    );
  }

  private isDatabaseSensitivePath(relativePath: string): boolean {
    const normalized = relativePath.toLowerCase().replaceAll('\\', '/');
    const fileName = normalized.split('/').at(-1) ?? normalized;

    return (
      normalized.includes('/prisma/') ||
      normalized.includes('/migrations/') ||
      fileName.includes('prisma') ||
      fileName.includes('database') ||
      fileName === 'db.ts' ||
      fileName === 'db.js' ||
      fileName === 'supabase.ts' ||
      fileName === 'supabase.js'
    );
  }

  private scoreFile(relativePath: string): number {
    const normalized = relativePath.toLowerCase().replaceAll('\\', '/');
    let score = 0;

    if (normalized.endsWith('.tsx')) score += 40;
    if (normalized.endsWith('.jsx')) score += 35;
    if (normalized.endsWith('.ts')) score += 20;
    if (normalized.endsWith('.js')) score += 15;
    if (normalized.endsWith('.css') || normalized.endsWith('.scss')) score += 25;

    if (normalized.includes('/components/')) score += 35;
    if (normalized.includes('/app/')) score += 25;
    if (normalized.includes('/pages/')) score += 25;
    if (normalized.includes('/sections/')) score += 20;
    if (normalized.includes('/layout/')) score += 15;
    if (normalized.includes('/ui/')) score += 15;

    if (normalized.includes('test') || normalized.includes('spec')) score -= 25;
    if (normalized.includes('types')) score -= 10;

    return score;
  }

  private dedupe(candidates: ResolvedPatchCandidate[]): ResolvedPatchCandidate[] {
    const seen = new Set<string>();
    const result: ResolvedPatchCandidate[] = [];

    for (const candidate of candidates) {
      const normalized = candidate.path.replaceAll('\\', '/');

      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      result.push({
        ...candidate,
        path: normalized,
      });
    }

    return result;
  }

  private isInsideProject(projectRoot: string, absolutePath: string): boolean {
    const root = path.resolve(projectRoot);
    const target = path.resolve(absolutePath);

    return target === root || target.startsWith(`${root}${path.sep}`);
  }
}
