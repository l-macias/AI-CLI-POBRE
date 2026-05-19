import type {
  SandboxCommandRequest,
  SandboxPolicyDecision,
  SandboxPolicyIssue,
} from '../types/SandboxTypes.js';
import { AllowedCommandRegistry } from './AllowedCommandRegistry.js';
import { CommandIsolation } from './CommandIsolation.js';
import { CommandRiskClassifier } from './CommandRiskClassifier.js';
import { FileIsolation } from './FileIsolation.js';
import { ResourceLimiter } from './ResourceLimiter.js';

export interface SandboxPolicyOptions {
  registry?: AllowedCommandRegistry | undefined;
  riskClassifier?: CommandRiskClassifier | undefined;
  fileIsolation?: FileIsolation | undefined;
  commandIsolation?: CommandIsolation | undefined;
  resourceLimiter?: ResourceLimiter | undefined;
}

export class SandboxPolicy {
  private readonly registry: AllowedCommandRegistry;
  private readonly riskClassifier: CommandRiskClassifier;
  private readonly fileIsolation: FileIsolation;
  private readonly commandIsolation: CommandIsolation;
  private readonly resourceLimiter: ResourceLimiter;

  public constructor(options: SandboxPolicyOptions = {}) {
    this.registry = options.registry ?? new AllowedCommandRegistry();
    this.riskClassifier = options.riskClassifier ?? new CommandRiskClassifier();
    this.fileIsolation = options.fileIsolation ?? new FileIsolation();
    this.commandIsolation = options.commandIsolation ?? new CommandIsolation();
    this.resourceLimiter = options.resourceLimiter ?? new ResourceLimiter();
  }

  public evaluate(request: SandboxCommandRequest): SandboxPolicyDecision {
    const definition = this.registry.get(request.command);
    const risk = this.riskClassifier.classify(request);
    const fileIsolation = this.fileIsolation.check(request);
    const commandIsolation = this.commandIsolation.check({
      request,
      definition,
    });
    const resourceLimit = this.resourceLimiter.check({
      request,
      definition,
    });

    const issues: SandboxPolicyIssue[] = [
      ...fileIsolation.issues,
      ...commandIsolation.issues,
      ...resourceLimit.issues,
      ...risk.reasons.map((reason) => ({
        code: 'SANDBOX_COMMAND_RISK_BLOCKED',
        message: reason,
        severity: 'error' as const,
      })),
    ];

    const allowed = issues.every((issue) => issue.severity !== 'error');

    const decision: SandboxPolicyDecision = {
      status: allowed ? 'allowed' : 'blocked',
      request: {
        ...request,
        args: [...request.args],
        pathArgs: request.pathArgs ? [...request.pathArgs] : undefined,
        env: request.env ? { ...request.env } : undefined,
      },
      risk,
      timeoutMs: resourceLimit.timeoutMs,
      maxOutputBytes: resourceLimit.maxOutputBytes,
      issues,
      decidedAt: new Date().toISOString(),
    };

    if (definition !== null) {
      decision.commandDefinition = definition;
    }

    return decision;
  }
}
