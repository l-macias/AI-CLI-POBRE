import type { SandboxCommandRequest, SandboxPolicyDecision } from '../types/SandboxTypes.js';
import { SandboxManager } from '../sandbox/SandboxManager.js';

export interface ShellExecutionGateOptions {
  sandboxManager?: SandboxManager | undefined;
}

export class ShellExecutionGate {
  private readonly sandboxManager: SandboxManager;

  public constructor(options: ShellExecutionGateOptions = {}) {
    this.sandboxManager = options.sandboxManager ?? new SandboxManager();
  }

  public evaluate(request: SandboxCommandRequest): SandboxPolicyDecision {
    return this.sandboxManager.evaluate(request);
  }
}
