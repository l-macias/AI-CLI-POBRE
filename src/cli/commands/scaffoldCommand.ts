import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliRepairProvider, CliScaffoldCommand, CliScaffoldModuleKind } from '../CliTypes.js';

interface ScaffoldRuntimeBridge {
  scaffold(command: CliScaffoldCommand): Promise<unknown>;
}

type ScaffoldPromptSession = ReturnType<typeof createInterface>;

export class ScaffoldCommand implements CliCommandHandler<CliScaffoldCommand> {
  public readonly name = 'scaffold';

  private readonly bridge: ScaffoldRuntimeBridge;

  public constructor(bridge: ScaffoldRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliScaffoldCommand): Promise<unknown> {
    if (command.interactive) {
      return this.executeInteractive(command);
    }

    return this.bridge.scaffold(command);
  }

  private async executeInteractive(command: CliScaffoldCommand): Promise<unknown> {
    const prompt = createInterface({
      input,
      output,
    });

    try {
      const projectRoot = await this.askOptionalString(prompt, 'Project path', command.projectRoot);
      const ensuredProjectRoot = await this.ensureProjectRoot(prompt, projectRoot);

      const moduleName = await this.askRequiredString(prompt, 'Module name', command.moduleName);

      const moduleKind = await this.askModuleKind(prompt, command.moduleKind);

      const defaultTarget =
        command.targetPath.trim().length > 0 ? command.targetPath : `src/modules/${moduleName}`;

      const targetPath = await this.askRequiredString(prompt, 'Target path', defaultTarget);

      const provider = await this.askProvider(prompt, command.provider);

      const providerModel =
        provider === 'openrouter'
          ? await this.askOptionalString(prompt, 'Provider model', command.providerModel)
          : command.providerModel;

      const allowRealProvider =
        provider === 'openrouter'
          ? await this.askBoolean(prompt, 'Allow real provider call', command.allowRealProvider)
          : command.allowRealProvider;

      const allowPremium =
        provider === 'openrouter'
          ? await this.askBoolean(prompt, 'Allow premium model', command.allowPremium)
          : command.allowPremium;

      const premiumApproved =
        allowPremium === true
          ? await this.askBoolean(prompt, 'Premium model approved', command.premiumApproved)
          : command.premiumApproved;

      const includeProjectMemory = await this.askBoolean(
        prompt,
        'Include project memory',
        command.includeProjectMemory,
      );

      const overwriteExisting = await this.askBoolean(
        prompt,
        'Overwrite existing files',
        command.overwriteExisting,
      );

      const dryRun = await this.askBoolean(prompt, 'Dry run', command.dryRun);

      const proposalOutputPath = await this.askOptionalString(
        prompt,
        'Save proposal path',
        command.proposalOutputPath ?? `.runtime/proposals/${moduleName}-module.patch-proposal.json`,
      );

      const interactiveCommand: CliScaffoldCommand = {
        ...command,
        projectRoot: ensuredProjectRoot,
        moduleName,
        moduleKind,
        targetPath,
        provider,
        providerModel,
        allowRealProvider,
        allowPremium,
        premiumApproved,
        includeProjectMemory,
        overwriteExisting,
        dryRun,
        proposalOutputPath,
      };

      return this.bridge.scaffold(interactiveCommand);
    } finally {
      prompt.close();
    }
  }

  private async askOptionalString(
    prompt: ScaffoldPromptSession,
    label: string,
    current: string | undefined,
  ): Promise<string | undefined> {
    const suffix = current ? ` [${current}]` : '';
    const value = await prompt.question(`${label}${suffix}: `);
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : current;
  }

  private async askRequiredString(
    prompt: ScaffoldPromptSession,
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

  private async askModuleKind(
    prompt: ScaffoldPromptSession,
    current: CliScaffoldModuleKind,
  ): Promise<CliScaffoldModuleKind> {
    while (true) {
      const value = await prompt.question(
        `Module kind backend|frontend|fullstack|library|generic [${current}]: `,
      );
      const trimmed = value.trim();

      if (trimmed.length === 0) {
        return current;
      }

      if (this.isModuleKind(trimmed)) {
        return trimmed;
      }

      console.log('Module kind must be one of: backend, frontend, fullstack, library, generic.');
    }
  }

  private async askProvider(
    prompt: ScaffoldPromptSession,
    current: CliRepairProvider,
  ): Promise<CliRepairProvider> {
    while (true) {
      const value = await prompt.question(`Provider fake-llm|static|openrouter [${current}]: `);
      const trimmed = value.trim();

      if (trimmed.length === 0) {
        return current;
      }

      if (this.isRepairProvider(trimmed)) {
        return trimmed;
      }

      console.log('Provider must be one of: fake-llm, static, openrouter.');
    }
  }

  private async askBoolean(
    prompt: ScaffoldPromptSession,
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

  private async ensureProjectRoot(
    prompt: ScaffoldPromptSession,
    projectRoot: string | undefined,
  ): Promise<string | undefined> {
    if (!projectRoot) {
      return projectRoot;
    }

    const resolved = resolve(projectRoot);

    if (await this.pathExists(resolved)) {
      return resolved;
    }

    const shouldCreate = await this.askBoolean(
      prompt,
      `Project path does not exist. Create ${resolved}`,
      false,
    );

    if (!shouldCreate) {
      throw new Error(
        `Scaffold interactive cancelled because project path does not exist: ${resolved}`,
      );
    }

    await mkdir(resolved, {
      recursive: true,
    });

    return resolved;
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private isModuleKind(value: string): value is CliScaffoldModuleKind {
    return (
      value === 'backend' ||
      value === 'frontend' ||
      value === 'fullstack' ||
      value === 'library' ||
      value === 'generic'
    );
  }

  private isRepairProvider(value: string): value is CliRepairProvider {
    return value === 'fake-llm' || value === 'static' || value === 'openrouter';
  }
}
