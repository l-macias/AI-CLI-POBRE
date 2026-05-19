import { CliCommandRegistry } from './CliCommandRegistry.js';
import { CliHelpRenderer } from './CliHelpRenderer.js';
import { CliRuntimeBridge } from './CliRuntimeBridge.js';
import { DoctorCommand } from './commands/doctorCommand.js';
import { GitCommand } from './commands/gitCommand.js';
import { HelpCommand } from './commands/helpCommand.js';
import { InitCommand } from './commands/initCommand.js';
import { InspectCommand } from './commands/inspectCommand.js';
import { PatchCommand } from './commands/patchCommand.js';
import { ProjectCommand } from './commands/projectCommand.js';
import { RepairCommand } from './commands/repairCommand.js';
import { StatusCommand } from './commands/statusCommand.js';
import { ValidateCommand } from './commands/validateCommand.js';
import { AgentCommand } from './commands/agentCommand.js';
import { SecurityCommand } from './commands/securityCommand.js';
import { ScaffoldCommand } from './commands/scaffoldCommand.js';
export interface CreateCliCommandRegistryOptions {
  bridge?: CliRuntimeBridge | undefined;
  helpRenderer?: CliHelpRenderer | undefined;
}

export function createCliCommandRegistry(
  options: CreateCliCommandRegistryOptions = {},
): CliCommandRegistry {
  const bridge = options.bridge ?? new CliRuntimeBridge();
  const helpRenderer = options.helpRenderer ?? new CliHelpRenderer();
  const registry = new CliCommandRegistry();

  registry.register(new HelpCommand(helpRenderer));
  registry.register(new InitCommand(bridge));
  registry.register(new InspectCommand(bridge));
  registry.register(new ValidateCommand(bridge));
  registry.register(new RepairCommand(bridge));
  registry.register(new StatusCommand(bridge));
  registry.register(new DoctorCommand(bridge));
  registry.register(new ProjectCommand(bridge));
  registry.register(new GitCommand(bridge));
  registry.register(new PatchCommand(bridge));
  registry.register(new AgentCommand(bridge));
  registry.register(new SecurityCommand(bridge));
  registry.register(new ScaffoldCommand(bridge));
  return registry;
}
