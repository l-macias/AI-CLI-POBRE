export interface VerifyCommandDefinition {
  id: string;
  label: string;
  command: string;
  args: string[];
  description: string;
}

export class VerifyCommandRegistry {
  private readonly commands: VerifyCommandDefinition[] = [
    {
      id: 'npm-build',
      label: 'npm run build',
      command: 'npm',
      args: ['run', 'build'],
      description: 'Run project build script.',
    },
    {
      id: 'npm-lint',
      label: 'npm run lint',
      command: 'npm',
      args: ['run', 'lint'],
      description: 'Run project lint script.',
    },
    {
      id: 'npm-typecheck',
      label: 'npm run typecheck',
      command: 'npm',
      args: ['run', 'typecheck'],
      description: 'Run project typecheck script.',
    },
    {
      id: 'tsc-no-emit',
      label: 'tsc --noEmit',
      command: 'tsc',
      args: ['--noEmit'],
      description: 'Run TypeScript compiler without emitting files.',
    },
  ];

  public list(): VerifyCommandDefinition[] {
    return [...this.commands];
  }

  public findById(id: string): VerifyCommandDefinition | undefined {
    return this.commands.find((command) => command.id === id);
  }

  public findByLabel(label: string): VerifyCommandDefinition | undefined {
    const normalized = label.trim().replaceAll(/\s+/g, ' ');

    return this.commands.find((command) => command.label === normalized);
  }
}
