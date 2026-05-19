export interface ResolvedShellCommand {
  executable: string;
  argsPrefix: string[];
  displayCommand: string;
}

export class ShellCommandResolver {
  public resolve(command: string): ResolvedShellCommand {
    if (command === 'npm') {
      return this.resolveNpm();
    }

    return {
      executable: command,
      argsPrefix: [],
      displayCommand: command,
    };
  }

  private resolveNpm(): ResolvedShellCommand {
    const npmExecPath = process.env['npm_execpath'];

    if (npmExecPath && npmExecPath.length > 0) {
      return {
        executable: process.execPath,
        argsPrefix: [npmExecPath],
        displayCommand: `${process.execPath} ${npmExecPath}`,
      };
    }

    if (process.platform === 'win32') {
      return {
        executable: 'npm.cmd',
        argsPrefix: [],
        displayCommand: 'npm.cmd',
      };
    }

    return {
      executable: 'npm',
      argsPrefix: [],
      displayCommand: 'npm',
    };
  }
}
