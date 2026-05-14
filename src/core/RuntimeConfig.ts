import type { AppEnv } from '../config/env.js';

export interface RuntimeConfig {
  projectName: string;
  defaultProvider: 'openrouter';
  defaultModel: string;
  maxEstimatedContextTokens: number;
  validationFirst: boolean;
  deterministicExecution: boolean;
}

export class RuntimeConfigFactory {
  public static fromEnv(env: AppEnv): RuntimeConfig {
    return {
      projectName: 'Zero Runtime',
      defaultProvider: 'openrouter',
      defaultModel: env.OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-4o-mini',
      maxEstimatedContextTokens: 1500,
      validationFirst: true,
      deterministicExecution: true,
    };
  }
}
