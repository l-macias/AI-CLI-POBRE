import type { z } from 'zod';
import type { JsonObject } from './SharedTypes.js';

export type ProviderName = 'openrouter';

export type ProviderRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ProviderMessage {
  role: ProviderRole;
  content: string;
}

export interface ProviderReasoningOptions {
  effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
  exclude?: boolean;
}

export interface ProviderRequest {
  model: string;
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  reasoning?: ProviderReasoningOptions;
}

export interface ProviderResponse {
  id: string;
  model: string;
  content: string;
  raw?: JsonObject;
  usage?: ProviderUsage;
}

export interface ProviderUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface Provider {
  readonly name: ProviderName;

  complete(request: ProviderRequest): Promise<ProviderResponse>;
}

export interface ProviderErrorDetails {
  provider: ProviderName;
  status?: number;
  message: string;
  cause?: unknown;
}

export interface ProviderJsonRequest<TSchema extends z.ZodType> extends ProviderRequest {
  schema: TSchema;
}

export interface ProviderJsonResponse<TValue> extends ProviderResponse {
  parsed: TValue;
}
