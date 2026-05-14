import type { ToolDefinition, ToolName } from '../types/ToolTypes.js';
import { ZeroRuntimeError } from '../utils/errors.js';

export class ToolRegistry {
  private readonly tools = new Map<ToolName, ToolDefinition>();

  public register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new ZeroRuntimeError(`Tool "${tool.name}" is already registered.`, {
        code: 'TOOL_ALREADY_REGISTERED',
        cause: {
          toolName: tool.name,
        },
      });
    }

    this.tools.set(tool.name, tool);
  }

  public get(toolName: ToolName): ToolDefinition {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new ZeroRuntimeError(`Tool "${toolName}" is not registered.`, {
        code: 'TOOL_NOT_REGISTERED',
        cause: {
          toolName,
        },
      });
    }

    return tool;
  }

  public has(toolName: ToolName): boolean {
    return this.tools.has(toolName);
  }

  public list(): ToolDefinition[] {
    return [...this.tools.values()];
  }
}
