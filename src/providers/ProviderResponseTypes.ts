import type { Result } from '../types/SharedTypes.js';

export type ProviderResponseIssueCode =
  | 'PROVIDER_CLIENT_ERROR'
  | 'PROVIDER_ERROR_PAYLOAD'
  | 'PROVIDER_RESPONSE_INVALID_SHAPE'
  | 'PROVIDER_RESPONSE_EMPTY_CHOICES'
  | 'PROVIDER_RESPONSE_MESSAGE_MISSING'
  | 'PROVIDER_RESPONSE_CONTENT_MISSING'
  | 'PROVIDER_RESPONSE_CONTENT_NOT_STRING';

export interface ProviderResponseIssue {
  code: ProviderResponseIssueCode;
  message: string;
  provider: string;
  model: string;
  retryable: boolean;
  statusCode?: number | undefined;
  requestId?: string | undefined;
}

export interface ProviderResponseUsage {
  promptTokens?: number | undefined;
  completionTokens?: number | undefined;
  totalTokens?: number | undefined;
}

export interface ProviderRawResponseInput {
  provider: string;
  model: string;
  statusCode: number;
  json: unknown;
  rawBody: string;
  requestId?: string | undefined;
}

export interface ProviderNormalizedTextResponse {
  provider: string;
  model: string;
  text: string;
  usage?: ProviderResponseUsage | undefined;
  finishReason?: string | undefined;
  requestId?: string | undefined;
  statusCode: number;
  normalizedAt: string;
}

export type ProviderNormalizedTextResult = Result<
  ProviderNormalizedTextResponse,
  ProviderResponseIssue
>;
