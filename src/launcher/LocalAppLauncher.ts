import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve } from 'node:path';
import { RuntimeApiServer } from '../api/RuntimeApiServer.js';
import { BrowserOpener } from './BrowserOpener.js';
import { LocalAppPreflight } from './LocalAppPreflight.js';
import type {
  LocalAppLauncherOptions,
  LocalAppLauncherProcess,
  LocalAppLauncherResult,
} from './LocalAppLauncherTypes.js';
import { LocalAppLauncherError } from './LocalAppLauncherTypes.js';

export interface LocalAppLauncherDependencies {
  browserOpener?: BrowserOpener | undefined;
  preflight?: LocalAppPreflight | undefined;
}

export class LocalAppLauncher implements LocalAppLauncherProcess {
  private readonly browserOpener: BrowserOpener;
  private readonly preflight: LocalAppPreflight;
  private apiServer: RuntimeApiServer | null = null;
  private uiProcess: ChildProcessWithoutNullStreams | null = null;

  public constructor(dependencies: LocalAppLauncherDependencies = {}) {
    this.browserOpener = dependencies.browserOpener ?? new BrowserOpener();
    this.preflight = dependencies.preflight ?? new LocalAppPreflight();
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

    const preflight = await this.preflight.check({
      host,
      apiPort,
      uiHost,
      uiPort,
      uiDir,
    });

    const plannedResult: LocalAppLauncherResult = {
      status: 'planned',
      apiUrl,
      uiUrl,
      uiCommand,
      openBrowser,
      preflight,
    };

    if (preflight.status === 'failed') {
      throw new LocalAppLauncherError('Zero Runtime launcher preflight failed.', plannedResult);
    }

    if (options.dryRun === true) {
      return plannedResult;
    }

    this.apiServer = new RuntimeApiServer({
      config: {
        host,
        port: apiPort,
      },
    });

    try {
      await this.apiServer.start();

      this.uiProcess = this.startUiProcess({
        uiDir,
        uiHost,
        uiPort,
      });

      if (openBrowser) {
        setTimeout(() => {
          const browserResult = this.browserOpener.open(uiUrl);

          if (browserResult.status === 'failed') {
            process.stderr.write(
              `Zero Runtime could not open the browser automatically: ${browserResult.message}\nOpen manually: ${uiUrl}\n`,
            );
          }
        }, 1_200);
      }

      return {
        ...plannedResult,
        status: 'started',
      };
    } catch (error: unknown) {
      await this.stop();

      const message = error instanceof Error ? error.message : String(error);

      throw new LocalAppLauncherError(`Zero Runtime launcher failed to start: ${message}`, {
        ...plannedResult,
        preflight: {
          status: 'failed',
          checks: [
            ...preflight.checks,
            {
              name: 'launcher-start',
              status: 'failed',
              message,
            },
          ],
          issues: [
            ...preflight.issues,
            {
              code: 'api_port_busy',
              severity: 'error',
              message,
              action:
                'Review the launcher output, verify the API/UI ports, then retry with --api-port or --ui-port if needed.',
            },
          ],
        },
      });
    }
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

    processRef.on('error', (error: Error) => {
      process.stderr.write(`Zero Runtime UI failed to start: ${error.message}\n`);
    });

    processRef.on('exit', (code) => {
      if (code !== null && code !== 0) {
        process.stderr.write(
          `Zero Runtime UI exited with code ${code}. Check the UI output above or run the command manually: ${this.formatUiCommand(
            input.uiDir,
            input.uiHost,
            input.uiPort,
          )}\n`,
        );
      }
    });

    return processRef;
  }

  private formatUiCommand(uiDir: string, uiHost: string, uiPort: number): string {
    return `cd ${uiDir} && npm run dev -- --host ${uiHost} --port ${uiPort}`;
  }
}
