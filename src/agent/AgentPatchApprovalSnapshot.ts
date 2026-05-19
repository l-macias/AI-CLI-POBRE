import { createHash } from 'node:crypto';
import type { PatchProposal } from '../types/RepairTypes.js';
import type { JsonArray, JsonObject, JsonValue } from '../types/SharedTypes.js';

export interface AgentPatchApprovalSnapshotInput {
  proposal: PatchProposal;
}

export interface AgentPatchApprovalSnapshotVerifyInput {
  proposal: PatchProposal;
  approvalMetadata?: JsonObject | undefined;
}

export interface AgentPatchApprovalSnapshotVerifyResult {
  valid: boolean;
  expectedFingerprint?: string | undefined;
  actualFingerprint: string;
  reason?: string | undefined;
}

export class AgentPatchApprovalSnapshot {
  public create(input: AgentPatchApprovalSnapshotInput): JsonObject {
    const operationTargets = input.proposal.operations.map((operation) => operation.targetFile);
    const operationKinds = input.proposal.operations.map((operation) => operation.kind);

    return {
      proposalId: input.proposal.id,
      proposalRiskLevel: input.proposal.riskLevel,
      operationCount: input.proposal.operations.length,
      operationTargets,
      operationKinds,
      proposalFingerprint: this.fingerprint(input.proposal),
    };
  }

  public verify(
    input: AgentPatchApprovalSnapshotVerifyInput,
  ): AgentPatchApprovalSnapshotVerifyResult {
    const actualFingerprint = this.fingerprint(input.proposal);
    const expectedFingerprint = this.readExpectedFingerprint(input.approvalMetadata);

    if (!expectedFingerprint) {
      return {
        valid: false,
        actualFingerprint,
        reason: 'Approval metadata does not include proposalFingerprint.',
      };
    }

    if (expectedFingerprint !== actualFingerprint) {
      return {
        valid: false,
        expectedFingerprint,
        actualFingerprint,
        reason: 'Approved proposal fingerprint does not match current patch proposal.',
      };
    }

    return {
      valid: true,
      expectedFingerprint,
      actualFingerprint,
    };
  }

  public fingerprint(proposal: PatchProposal): string {
    return createHash('sha256').update(this.canonicalize(proposal)).digest('hex');
  }

  private readExpectedFingerprint(metadata: JsonObject | undefined): string | undefined {
    const value = metadata?.['proposalFingerprint'];

    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
  }

  private canonicalize(value: unknown): string {
    if (value === null) {
      return 'null';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonicalize(item)).join(',')}]`;
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();

      return `{${keys
        .map((key) => {
          return `${JSON.stringify(key)}:${this.canonicalize(record[key])}`;
        })
        .join(',')}}`;
    }

    return JSON.stringify(null);
  }

  public isJsonObject(value: unknown): value is JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    return Object.values(value).every((item) => this.isJsonValue(item));
  }

  private isJsonValue(value: unknown): value is JsonValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return this.isJsonArray(value);
    }

    return this.isJsonObject(value);
  }

  private isJsonArray(value: unknown[]): value is JsonArray {
    return value.every((item) => this.isJsonValue(item));
  }
}
