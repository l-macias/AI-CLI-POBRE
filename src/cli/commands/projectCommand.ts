import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliProjectCommand } from '../CliTypes.js';

type ProjectPromptSession = ReturnType<typeof createInterface>;

export class ProjectCommand implements CliCommandHandler<CliProjectCommand> {
  public readonly name = 'project';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliProjectCommand): Promise<unknown> {
    if (command.interactive && command.action === 'add') {
      return this.executeInteractiveAdd(command);
    }

    return this.bridge.project(command);
  }

  private async executeInteractiveAdd(command: CliProjectCommand): Promise<unknown> {
    const prompt = createInterface({
      input,
      output,
    });

    try {
      const targetPath = await this.askExistingPath(prompt, command.targetPath);
      const targetName = await this.askRequiredString(
        prompt,
        'Project name',
        command.targetName ?? this.defaultProjectNameFromPath(targetPath),
      );
      const setCurrent = await this.askBoolean(
        prompt,
        'Set as current project',
        command.setCurrent ?? true,
      );

      const interactiveCommand: CliProjectCommand = {
        ...command,
        targetPath,
        targetName,
        setCurrent,
      };

      return this.bridge.project(interactiveCommand);
    } finally {
      prompt.close();
    }
  }

  private async askExistingPath(
    prompt: ProjectPromptSession,
    current: string | undefined,
  ): Promise<string> {
    while (true) {
      const suffix = current ? ` [${current}]` : '';
      const value = await prompt.question(`Project path${suffix}: `);
      const trimmed = value.trim();
      const candidate = trimmed.length > 0 ? trimmed : current;

      if (!candidate || candidate.trim().length === 0) {
        console.log('Project path is required.');
        continue;
      }

      const resolved = resolve(candidate);

      if (await this.pathExists(resolved)) {
        return resolved;
      }

      console.log(`Project path does not exist: ${resolved}`);
    }
  }

  private async askRequiredString(
    prompt: ProjectPromptSession,
    label: string,
    current: string,
  ): Promise<string> {
    const suffix = current.trim().length > 0 ? ` [${current}]` : '';

    while (true) {
      const value = await prompt.question(`${label}${suffix}: `);
      const trimmed = value.trim();

      if (trimmed.length > 0) {
        return trimmed;
      }

      if (current.trim().length > 0) {
        return current;
      }

      console.log(`${label} is required.`);
    }
  }

  private async askBoolean(
    prompt: ProjectPromptSession,
    label: string,
    current: boolean,
  ): Promise<boolean> {
    const defaultLabel = current ? 'Y/n' : 'y/N';
    const value = await prompt.question(`${label}? [${defaultLabel}]: `);
    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0) {
      return current;
    }

    return (
      normalized === 'y' || normalized === 'yes' || normalized === '1' || normalized === 'true'
    );
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private defaultProjectNameFromPath(path: string): string {
    const normalized = path.replaceAll('\\', '/');
    const parts = normalized.split('/').filter((part) => part.trim().length > 0);

    return parts.at(-1) ?? 'target-project';
  }
}
