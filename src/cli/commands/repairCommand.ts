import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import type { FakeLlmRepairProposalMode } from '../../repair/FakeLlmRepairProposalProvider.js';
import type { CliRuntimeBridge } from '../CliRuntimeBridge.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliRepairCommand, CliRepairProvider } from '../CliTypes.js';

type RepairPromptSession = ReturnType<typeof createInterface>;

export class RepairCommand implements CliCommandHandler<CliRepairCommand> {
  public readonly name = 'repair';

  private readonly bridge: CliRuntimeBridge;

  public constructor(bridge: CliRuntimeBridge) {
    this.bridge = bridge;
  }

  public execute(command: CliRepairCommand): Promise<unknown> {
    if (command.interactive) {
      return this.executeInteractive(command);
    }

    return this.bridge.repair(command);
  }

  private async executeInteractive(command: CliRepairCommand): Promise<unknown> {
    const prompt = createInterface({
      input,
      output,
    });

    try {
      const projectRoot = await this.askOptionalString(prompt, 'Project path', command.projectRoot);

      const targetFiles = await this.askTargetFiles(prompt, command.targetFiles);

      const objective = await this.askRequiredString(prompt, 'Objective', command.objective);

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

      const interactiveCommand: CliRepairCommand = {
        ...command,
        projectRoot,
        targetFiles,
        objective,
        provider,
        providerModel,
        allowRealProvider,
        allowPremium,
        premiumApproved,
        includeProjectMemory,
      };

      return this.bridge.repair(interactiveCommand);
    } finally {
      prompt.close();
    }
  }

  private async askOptionalString(
    prompt: RepairPromptSession,
    label: string,
    current: string | undefined,
  ): Promise<string | undefined> {
    const suffix = current ? ` [${current}]` : '';
    const value = await prompt.question(`${label}${suffix}: `);
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : current;
  }

  private async askRequiredString(
    prompt: RepairPromptSession,
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

  private async askTargetFiles(
    prompt: RepairPromptSession,
    current: readonly string[],
  ): Promise<string[]> {
    const suffix = current.length > 0 ? ` [${current.join(', ')}]` : '';
    const value = await prompt.question(`Target files, comma-separated${suffix}: `);
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return [...current];
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private async askProvider(
    prompt: RepairPromptSession,
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
    prompt: RepairPromptSession,
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

  private isRepairProvider(value: string): value is CliRepairProvider {
    return value === 'fake-llm' || value === 'static' || value === 'openrouter';
  }

  // Reserved for future interactive fake-provider selection.
  private isFakeProviderMode(value: string): value is FakeLlmRepairProposalMode {
    return (
      value === 'json_only' ||
      value === 'markdown_json' ||
      value === 'text_around_json' ||
      value === 'invalid_json' ||
      value === 'invalid_schema'
    );
  }
}
