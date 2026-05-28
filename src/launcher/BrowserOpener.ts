import { spawn } from 'node:child_process';

export interface BrowserOpenResult {
  status: 'opened' | 'failed';
  url: string;
  message: string;
}

export class BrowserOpener {
  public open(url: string): BrowserOpenResult {
    const command = this.resolveCommand(url);

    try {
      const child = spawn(command.command, command.args, {
        stdio: 'ignore',
        detached: true,
        shell: false,
        windowsHide: true,
      });

      child.unref();

      return {
        status: 'opened',
        url,
        message: `Browser open command dispatched for ${url}.`,
      };
    } catch (error: unknown) {
      return {
        status: 'failed',
        url,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private resolveCommand(url: string): {
    command: string;
    args: string[];
  } {
    if (process.platform === 'win32') {
      return {
        command: 'cmd',
        args: ['/c', 'start', '', url],
      };
    }

    if (process.platform === 'darwin') {
      return {
        command: 'open',
        args: [url],
      };
    }

    return {
      command: 'xdg-open',
      args: [url],
    };
  }
}
