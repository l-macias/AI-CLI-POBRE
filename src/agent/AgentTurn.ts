import type { AgentTurn, AgentTurnRole } from './AgentTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

export interface AgentTurnCreateInput {
  role: AgentTurnRole;
  message: string;
  metadata?: JsonObject | undefined;
}

export class AgentTurnFactory {
  public create(input: AgentTurnCreateInput): AgentTurn {
    const createdAt = new Date().toISOString();

    return {
      id: `agent-turn-${createdAt.replaceAll(':', '').replaceAll('.', '')}`,
      role: input.role,
      message: input.message,
      createdAt,
      metadata: input.metadata,
    };
  }
}
