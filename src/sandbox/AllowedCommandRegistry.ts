import type { AllowedCommandDefinition } from '../types/SandboxTypes.js';

export class AllowedCommandRegistry {
  private readonly commands = new Map<string, AllowedCommandDefinition>();

  public constructor() {
    this.registerDefaults();
  }

  public register(definition: AllowedCommandDefinition): void {
    this.commands.set(definition.command, {
      ...definition,
      allowedArgs: [...definition.allowedArgs],
      allowedCwdPrefixes: [...definition.allowedCwdPrefixes],
    });
  }

  public get(command: string): AllowedCommandDefinition | null {
    return this.commands.get(command) ?? null;
  }

  public list(): AllowedCommandDefinition[] {
    return [...this.commands.values()].map((definition) => ({
      ...definition,
      allowedArgs: [...definition.allowedArgs],
      allowedCwdPrefixes: [...definition.allowedCwdPrefixes],
    }));
  }

  private registerDefaults(): void {
    this.register({
      command: 'npm',
      allowedArgs: ['run typecheck', 'run lint', 'run build', 'test'],
      description: 'Controlled npm validation/build/test commands.',
      riskLevel: 'low',
      defaultTimeoutMs: 120_000,
      defaultMaxOutputBytes: 200_000,
      allowNetwork: false,
      allowedCwdPrefixes: ['.', '.runtime/sandbox-tests'],
    });

    this.register({
      command: 'pnpm',
      allowedArgs: ['run typecheck', 'run lint', 'run build', 'test'],
      description: 'Controlled pnpm validation/build/test commands.',
      riskLevel: 'low',
      defaultTimeoutMs: 120_000,
      defaultMaxOutputBytes: 200_000,
      allowNetwork: false,
      allowedCwdPrefixes: ['.', '.runtime/sandbox-tests'],
    });

    this.register({
      command: 'yarn',
      allowedArgs: ['typecheck', 'lint', 'build', 'test'],
      description: 'Controlled yarn validation/build/test commands.',
      riskLevel: 'low',
      defaultTimeoutMs: 120_000,
      defaultMaxOutputBytes: 200_000,
      allowNetwork: false,
      allowedCwdPrefixes: ['.', '.runtime/sandbox-tests'],
    });
  }
}
