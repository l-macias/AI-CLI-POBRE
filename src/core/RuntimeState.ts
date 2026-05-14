import type { AgentPhase } from './AgentPhase.js';
import { initialAgentPhase } from './AgentPhase.js';
import type { RuntimeObjective } from '../types/ObjectiveTypes.js';
import type { RuntimePlanReview } from '../types/PlanningTypes.js';

export interface AgentRuntimeStateSnapshot {
  phase: AgentPhase;
  initializedAt: string | null;
  activeProvider: string | null;
  activeModel: string | null;
  contextTokenEstimate: number;
  loadedContextSources: string[];
  activeObjective: RuntimeObjective | null;
  activePlanReview: RuntimePlanReview | null;
  lastError: string | null;
}

export class RuntimeState {
  private phase: AgentPhase = initialAgentPhase;
  private initializedAt: string | null = null;
  private activeProvider: string | null = null;
  private activeModel: string | null = null;
  private contextTokenEstimate = 0;
  private loadedContextSources: string[] = [];
  private activeObjective: RuntimeObjective | null = null;
  private activePlanReview: RuntimePlanReview | null = null;
  private lastError: string | null = null;

  public setPhase(phase: AgentPhase): void {
    this.phase = phase;
  }

  public markInitialized(input: {
    provider: string;
    model: string;
    contextTokenEstimate: number;
    loadedContextSources: string[];
  }): void {
    this.initializedAt = new Date().toISOString();
    this.activeProvider = input.provider;
    this.activeModel = input.model;
    this.contextTokenEstimate = input.contextTokenEstimate;
    this.loadedContextSources = input.loadedContextSources;
    this.activeObjective = null;
    this.activePlanReview = null;
    this.lastError = null;
    this.phase = 'ready';
  }

  public setObjective(objective: RuntimeObjective): void {
    this.activeObjective = objective;
    this.activePlanReview = null;
    this.phase = 'planning';
    this.lastError = null;
  }

  public setActivePlanReview(review: RuntimePlanReview): void {
    this.activePlanReview = review;
    this.lastError = null;
  }

  public markFailed(error: unknown): void {
    this.phase = 'failed';
    this.lastError = error instanceof Error ? error.message : String(error);
  }

  public snapshot(): AgentRuntimeStateSnapshot {
    return {
      phase: this.phase,
      initializedAt: this.initializedAt,
      activeProvider: this.activeProvider,
      activeModel: this.activeModel,
      contextTokenEstimate: this.contextTokenEstimate,
      loadedContextSources: [...this.loadedContextSources],
      activeObjective: this.activeObjective,
      activePlanReview: this.activePlanReview,
      lastError: this.lastError,
    };
  }
}
