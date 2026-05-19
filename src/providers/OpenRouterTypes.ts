import type { Result } from '../types/SharedTypes.js';

export type OpenRouterProviderName = 'openrouter';

export type OpenRouterMessageRole = 'system' | 'user' | 'assistant';

export type OpenRouterErrorCode =
  | 'OPENROUTER_NOT_ENABLED'
  | 'OPENROUTER_API_KEY_MISSING'
  | 'OPENROUTER_API_KEY_INVALID'
  | 'OPENROUTER_MODEL_MISSING'
  | 'OPENROUTER_CONFIG_INVALID'
  | 'OPENROUTER_TIMEOUT'
  | 'OPENROUTER_NETWORK_ERROR'
  | 'OPENROUTER_RATE_LIMITED'
  | 'OPENROUTER_UNAUTHORIZED'
  | 'OPENROUTER_FORBIDDEN'
  | 'OPENROUTER_UNAVAILABLE'
  | 'OPENROUTER_HTTP_ERROR'
  | 'OPENROUTER_INVALID_RESPONSE'
  | 'OPENROUTER_JSON_PARSE_FAILED';

export interface OpenRouterConfig {
  provider: OpenRouterProviderName;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  timeoutMs: number;
  maxTokens: number;
  httpReferer?: string | undefined;
  appTitle?: string | undefined;
}

export interface OpenRouterConfigEnvironment {
  ZERO_OPENROUTER_ENABLED?: string | undefined;
  OPENROUTER_API_KEY?: string | undefined;
  ZERO_OPENROUTER_MODEL?: string | undefined;
  OPENROUTER_BASE_URL?: string | undefined;
  ZERO_OPENROUTER_TIMEOUT_MS?: string | undefined;
  ZERO_OPENROUTER_MAX_TOKENS?: string | undefined;
  OPENROUTER_HTTP_REFERER?: string | undefined;
  OPENROUTER_APP_TITLE?: string | undefined;
}

export interface OpenRouterConfigLoaderInput {
  env?: Record<string, string | undefined> | undefined;
  requireApiKey?: boolean | undefined;
  requireExplicitOptIn?: boolean | undefined;
  defaultModel?: string | undefined;
  defaultBaseUrl?: string | undefined;
  defaultTimeoutMs?: number | undefined;
  defaultMaxTokens?: number | undefined;
}

export interface OpenRouterProviderError {
  code: OpenRouterErrorCode;
  message: string;
  retryable: boolean;
  statusCode?: number | undefined;
  causeName?: string | undefined;
}

export interface OpenRouterChatMessage {
  role: OpenRouterMessageRole;
  content: string;
}

export interface OpenRouterChatCompletionInput {
  model?: string | undefined;
  messages: OpenRouterChatMessage[];
  maxTokens?: number | undefined;
  temperature?: number | undefined;
}

export interface OpenRouterChatCompletionBody {
  model: string;
  messages: OpenRouterChatMessage[];
  max_tokens?: number | undefined;
  temperature?: number | undefined;
}

export interface OpenRouterFetchInit {
  method: 'POST';
  headers: Record<string, string>;
  body: string;
  signal?: AbortSignal | undefined;
}

export interface OpenRouterHttpHeaders {
  get(name: string): string | null;
}

export interface OpenRouterHttpResponse {
  ok: boolean;
  status: number;
  headers: OpenRouterHttpHeaders;
  text(): Promise<string>;
}

export type OpenRouterFetcher = (
  url: string,
  init: OpenRouterFetchInit,
) => Promise<OpenRouterHttpResponse>;

export interface OpenRouterClientOptions {
  config: OpenRouterConfig;
  fetcher?: OpenRouterFetcher | undefined;
}

export interface OpenRouterClientResponse {
  statusCode: number;
  rawBody: string;
  json: unknown;
  requestId?: string | undefined;
}

export type OpenRouterClientResult = Result<OpenRouterClientResponse, OpenRouterProviderError>;
