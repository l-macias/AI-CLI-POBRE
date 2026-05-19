import type { PatchOperation, PatchProposal, RepairRiskLevel } from '../types/RepairTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

export interface AgentPatchApplyIntent {
  proposal: PatchProposal;
}

export class AgentPatchApplyIntentBuilder {
  public buildFromMetadata(metadata: JsonObject | undefined): AgentPatchApplyIntent {
    const repairExecution = this.asRecord(metadata?.['execution_request_repair_proposal']);
    const proposal = this.asRecord(repairExecution['proposal']);

    return {
      proposal: this.parseProposal(proposal),
    };
  }

  private parseProposal(value: Record<string, unknown>): PatchProposal {
    const id = this.requireString(value, 'id');
    const summary = this.requireString(value, 'summary');
    const riskLevel = this.requireRiskLevel(value['riskLevel']);
    const operationsRaw = value['operations'];
    const explanation = this.requireString(value, 'explanation');

    if (!Array.isArray(operationsRaw)) {
      throw new Error('Agent patch apply intent is missing proposal operations.');
    }

    return {
      id,
      summary,
      riskLevel,
      operations: operationsRaw.map((operation, index) => {
        return this.parseOperation(operation, index);
      }),
      explanation,
    };
  }

  private parseOperation(value: unknown, index: number): PatchOperation {
    const record = this.asRecord(value);
    const kind = this.requireOperationKind(record['kind'], index);
    const targetFile = this.requireString(record, 'targetFile');
    const reason = this.requireString(record, 'reason');

    const operation: PatchOperation = {
      kind,
      targetFile,
      reason,
    };

    if (typeof record['newContent'] === 'string') {
      operation.newContent = record['newContent'];
    }

    if (typeof record['expectedCurrentContent'] === 'string') {
      operation.expectedCurrentContent = record['expectedCurrentContent'];
    }

    return operation;
  }

  private requireString(record: Record<string, unknown>, key: string): string {
    const value = record[key];

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Agent patch apply intent field ${key} must be a non-empty string.`);
    }

    return value;
  }

  private requireRiskLevel(value: unknown): RepairRiskLevel {
    if (value === 'low' || value === 'medium' || value === 'high') {
      return value;
    }

    throw new Error('Agent patch apply intent riskLevel is invalid.');
  }

  private requireOperationKind(value: unknown, index: number): PatchOperation['kind'] {
    if (
      value === 'replace_file' ||
      value === 'edit_file' ||
      value === 'create_file' ||
      value === 'delete_file'
    ) {
      return value;
    }

    throw new Error(`Agent patch apply intent operation ${index} kind is invalid.`);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }
}
