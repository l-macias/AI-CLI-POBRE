import { constants } from 'node:fs';
import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export type LocalDirectoryEntryKind = 'directory' | 'file';

export interface LocalDirectoryEntry {
  name: string;
  path: string;
  kind: LocalDirectoryEntryKind;
  hasPackageJson?: boolean | undefined;
  hasZeroConfig?: boolean | undefined;
}

export interface LocalDirectoryListResult {
  currentPath: string;
  parentPath: string | null;
  entries: LocalDirectoryEntry[];
}

export class LocalDirectoryBrowser {
  public async listRoots(): Promise<LocalDirectoryEntry[]> {
    if (process.platform === 'win32') {
      return this.listWindowsRoots();
    }

    return [
      {
        name: '/',
        path: '/',
        kind: 'directory',
      },
    ];
  }

  public async listChildren(targetPath: string): Promise<LocalDirectoryListResult> {
    const currentPath = path.resolve(targetPath);
    const currentStat = await stat(currentPath);

    if (!currentStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${currentPath}`);
    }

    const rawEntries = await readdir(currentPath, {
      withFileTypes: true,
    });

    const entries: LocalDirectoryEntry[] = [];

    for (const entry of rawEntries) {
      if (this.shouldHideEntry(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        entries.push({
          name: entry.name,
          path: absolutePath,
          kind: 'directory',
          hasPackageJson: await this.exists(path.join(absolutePath, 'package.json')),
          hasZeroConfig: await this.exists(path.join(absolutePath, '.zero', 'project.json')),
        });

        continue;
      }

      entries.push({
        name: entry.name,
        path: absolutePath,
        kind: 'file',
      });
    }

    return {
      currentPath,
      parentPath: this.parentPath(currentPath),
      entries: entries.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === 'directory' ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      }),
    };
  }

  private async listWindowsRoots(): Promise<LocalDirectoryEntry[]> {
    const roots: LocalDirectoryEntry[] = [];

    for (let code = 65; code <= 90; code += 1) {
      const drive = `${String.fromCharCode(code)}:\\`;

      if (await this.exists(drive)) {
        roots.push({
          name: drive,
          path: drive,
          kind: 'directory',
        });
      }
    }

    return roots;
  }

  private parentPath(targetPath: string): string | null {
    const parsed = path.parse(targetPath);

    if (targetPath === parsed.root) {
      return null;
    }

    return path.dirname(targetPath);
  }

  private async exists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private shouldHideEntry(name: string): boolean {
    return (
      name === 'node_modules' ||
      name === '.git' ||
      name === 'dist' ||
      name === 'build' ||
      name === '.next' ||
      name === '.turbo'
    );
  }
}
