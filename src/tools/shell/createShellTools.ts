import type { RuntimeTool } from '../../types/ToolTypes.js';
import { BuildCommandTool } from './BuildCommandTool.js';
import { DryRunCommandTool } from './DryRunCommandTool.js';
import { NpmScriptTool } from './NpmScriptTool.js';
import { TestCommandTool } from './TestCommandTool.js';

export function createShellTools(): RuntimeTool[] {
  return [
    new DryRunCommandTool(),
    new NpmScriptTool(),
    new TestCommandTool(),
    new BuildCommandTool(),
  ];
}
