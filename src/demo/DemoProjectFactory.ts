import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface DemoProjectFactoryInput {
  readonly projectRoot: string;
  readonly projectName?: string | undefined;
}

export interface DemoProjectFixture {
  readonly projectRoot: string;
  readonly projectName: string;
  readonly targetFile: string;
}

export class DemoProjectFactory {
  public async create(input: DemoProjectFactoryInput): Promise<DemoProjectFixture> {
    const projectRoot = resolve(input.projectRoot);
    const projectName = input.projectName ?? 'zero-runtime-demo-project';

    await rm(projectRoot, {
      recursive: true,
      force: true,
    });

    await mkdir(resolve(projectRoot, 'src/modules'), {
      recursive: true,
    });

    await writeFile(
      resolve(projectRoot, 'package.json'),
      `${JSON.stringify(
        {
          name: projectName,
          scripts: {
            typecheck: 'tsc --noEmit',
          },
          dependencies: {
            express: '^5.0.0',
          },
          devDependencies: {
            typescript: '^5.7.2',
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await writeFile(resolve(projectRoot, 'package-lock.json'), '{}\n', 'utf8');

    await writeFile(
      resolve(projectRoot, 'tsconfig.json'),
      `${JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
          },
          include: ['src/**/*.ts'],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await writeFile(resolve(projectRoot, 'src/index.ts'), 'export const value = 1;\n', 'utf8');

    await this.initializeGit(projectRoot);

    return {
      projectRoot,
      projectName,
      targetFile: 'src/index.ts',
    };
  }

  private async initializeGit(projectRoot: string): Promise<void> {
    await execFileAsync('git', ['init', '-b', 'test-branch'], {
      cwd: projectRoot,
      windowsHide: true,
    });

    await execFileAsync('git', ['config', 'user.email', 'zero-runtime@example.local'], {
      cwd: projectRoot,
      windowsHide: true,
    });

    await execFileAsync('git', ['config', 'user.name', 'Zero Runtime Test'], {
      cwd: projectRoot,
      windowsHide: true,
    });

    await execFileAsync('git', ['config', 'core.autocrlf', 'false'], {
      cwd: projectRoot,
      windowsHide: true,
    });

    await execFileAsync('git', ['config', 'core.eol', 'lf'], {
      cwd: projectRoot,
      windowsHide: true,
    });

    await writeFile(resolve(projectRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');

    await execFileAsync('git', ['add', '.'], {
      cwd: projectRoot,
      windowsHide: true,
    });

    await execFileAsync('git', ['commit', '-m', 'initial commit'], {
      cwd: projectRoot,
      windowsHide: true,
    });
  }
}
