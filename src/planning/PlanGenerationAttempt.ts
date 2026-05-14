export type PlanGenerationAttemptKind = 'primary' | 'repair';

export type PlanGenerationFailureKind =
  | 'invalid_json'
  | 'invalid_schema'
  | 'provider_rate_limited'
  | 'provider_auth_failed'
  | 'provider_payment_required'
  | 'provider_forbidden'
  | 'provider_model_not_found'
  | 'provider_network_error'
  | 'provider_empty_response'
  | 'provider_unknown'
  | 'unknown';

export interface PlanGenerationAttempt {
  index: number;
  kind: PlanGenerationAttemptKind;
  prompt: string;
}

export interface PlanGenerationFailure {
  attempt: {
    index: number;
    kind: PlanGenerationAttemptKind;
  };
  kind: PlanGenerationFailureKind;
  retryable: boolean;
  error: Record<string, unknown>;
}

export interface PlanGenerationRetryDecision {
  retry: boolean;
  reason: string;
}
