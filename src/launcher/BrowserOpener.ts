import { spawn } from 'node:child_process';

export class BrowserOpener {
  public open(url: string): void {
    const command = this.resolveCommand(url);

    const child = spawn(command.command, command.args, {
      stdio: 'ignore',
      detached: true,
      shell: false,
      windowsHide: true,
    });

    child.unref();
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
