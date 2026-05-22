import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface PackageScriptScanResult {
  projectRoot: string;
  packageJsonPath: string;
  scripts: Record<string, string>;
  safeVerifyScripts: string[];
}

export class PackageScriptScanner {
  public async scan(projectRoot: string): Promise<PackageScriptScanResult> {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const raw = await readFile(packageJsonPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (!this.isRecord(parsed)) {
      throw new Error(`Invalid package.json: ${packageJsonPath}`);
    }

    const scripts = this.readScripts(parsed['scripts']);

    return {
      projectRoot,
      packageJsonPath,
      scripts,
      safeVerifyScripts: this.resolveSafeVerifyScripts(scripts),
    };
  }

  private readScripts(value: unknown): Record<string, string> {
    if (!this.isRecord(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, string] => {
        return typeof entry[1] === 'string';
      }),
    );
  }

  private resolveSafeVerifyScripts(scripts: Record<string, string>): string[] {
    return ['build', 'lint', 'typecheck'].filter((script) => script in scripts);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
