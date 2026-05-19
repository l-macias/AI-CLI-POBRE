import type { RealProjectTrialErrorFinding } from '../types/RealProjectTrialTypes.js';
import type { RepairRequest, RepairTargetFile } from '../types/RepairTypes.js';

export interface RepairRequestBuilderInput {
  objective: string;
  projectRoot: string;
  findings: RealProjectTrialErrorFinding[];
  targetFiles: RepairTargetFile[];
}

export class RepairRequestBuilder {
  public build(input: RepairRequestBuilderInput): RepairRequest {
    const timestamp = new Date().toISOString();

    return {
      id: `repair-request-${timestamp.replaceAll(':', '').replaceAll('.', '')}`,
      objective: input.objective,
      projectRoot: input.projectRoot,
      findings: input.findings,
      targetFiles: input.targetFiles,
      constraints: [
        {
          code: 'NO_SECRET_ACCESS',
          description: 'Do not read, expose, or modify .env files or secrets.',
          severity: 'error',
        },
        {
          code: 'NO_UNRELATED_CHANGES',
          description: 'Only modify files directly related to the captured findings.',
          severity: 'error',
        },
        {
          code: 'PRESERVE_EXISTING_STYLE',
          description: 'Preserve the project coding style and architecture.',
          severity: 'warning',
        },
        {
          code: 'NO_AUTOMATIC_WRITE',
          description: 'The proposal must be previewed as a diff before writing.',
          severity: 'error',
        },
      ],
      expectedOutput: {
        format: 'json_patch_proposal',
        allowedOperations: ['replace_file', 'edit_file', 'create_file'],
        requireExplanation: true,
        requireRiskAssessment: true,
      },
      metadata: {
        createdAt: timestamp,
        source: 'RepairRequestBuilder',
      },
    };
  }
}
