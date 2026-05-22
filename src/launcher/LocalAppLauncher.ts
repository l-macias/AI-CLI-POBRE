import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve } from 'node:path';
import { RuntimeApiServer } from '../api/RuntimeApiServer.js';
import { BrowserOpener } from './BrowserOpener.js';
import type {
  LocalAppLauncherOptions,
  LocalAppLauncherProcess,
  LocalAppLauncherResult,
} from './LocalAppLauncherTypes.js';

export interface LocalAppLauncherDependencies {
  browserOpener?: BrowserOpener | undefined;
}

export class LocalAppLauncher implements LocalAppLauncherProcess {
  private readonly browserOpener: BrowserOpener;
  private apiServer: RuntimeApiServer | null = null;
  private uiProcess: ChildProcessWithoutNullStreams | null = null;

  public constructor(dependencies: LocalAppLauncherDependencies = {}) {
    this.browserOpener = dependencies.browserOpener ?? new BrowserOpener();
  }

  public async start(options: LocalAppLauncherOptions = {}): Promise<LocalAppLauncherResult> {
    const host = options.host ?? '127.0.0.1';
    const apiPort = options.apiPort ?? 17871;
    const uiHost = options.uiHost ?? '127.0.0.1';
    const uiPort = options.uiPort ?? 5173;
    const uiDir = resolve(options.uiDir ?? 'ui');
    const openBrowser = options.openBrowser ?? true;
    const apiUrl = `http://${host}:${apiPort}`;
    const uiUrl = `http://${uiHost}:${uiPort}`;
    const uiCommand = this.formatUiCommand(uiDir, uiHost, uiPort);

    if (options.dryRun === true) {
      return {
        status: 'planned',
        apiUrl,
        uiUrl,
        uiCommand,
        openBrowser,
      };
    }

    this.apiServer = new RuntimeApiServer({
      config: {
        host,
        port: apiPort,
      },
    });

    await this.apiServer.start();

    this.uiProcess = this.startUiProcess({
      uiDir,
      uiHost,
      uiPort,
    });

    if (openBrowser) {
      setTimeout(() => {
        this.browserOpener.open(uiUrl);
      }, 1_200);
    }

    return {
      status: 'started',
      apiUrl,
      uiUrl,
      uiCommand,
      openBrowser,
    };
  }

  public async stop(): Promise<void> {
    if (this.uiProcess) {
      this.uiProcess.kill('SIGTERM');
      this.uiProcess = null;
    }

    if (this.apiServer) {
      await this.apiServer.stop();
      this.apiServer = null;
    }
  }

  private startUiProcess(input: {
    uiDir: string;
    uiHost: string;
    uiPort: number;
  }): ChildProcessWithoutNullStreams {
    const processRef = spawn(
      'npm',
      ['run', 'dev', '--', '--host', input.uiHost, '--port', String(input.uiPort)],
      {
        cwd: input.uiDir,
        shell: process.platform === 'win32',
        windowsHide: false,
      },
    );

    processRef.stdout.on('data', (chunk: Buffer) => {
      process.stdout.write(chunk);
    });

    processRef.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    processRef.on('exit', (code) => {
      if (code !== null && code !== 0) {
        process.stderr.write(`Zero Runtime UI exited with code ${code}\n`);
      }
    });

    return processRef;
  }

  private formatUiCommand(uiDir: string, uiHost: string, uiPort: number): string {
    return `cd ${uiDir} && npm run dev -- --host ${uiHost} --port ${uiPort}`;
  }
}
