import { SessionPersistence } from '../session/SessionPersistence.js';
import type { RuntimePlan, RuntimePlanReview } from '../types/PlanningTypes.js';

export class PlanPersistence {
  private readonly persistence = new SessionPersistence();

  public async persistReviewedPlan(review: RuntimePlanReview): Promise<void> {
    await this.writeActivePlanReview(review);
    await this.appendPlanHistory(review);
  }

  public async persistAcceptedPlan(plan: RuntimePlan): Promise<void> {
    const timestamp = new Date().toISOString();

    await this.persistReviewedPlan({
      plan,
      status: 'validated',
      validation: {
        valid: true,
        issues: [],
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  private async writeActivePlanReview(review: RuntimePlanReview): Promise<void> {
    const serializedPlan = `${JSON.stringify(review, null, 2)}\n`;

    await this.persistence.writeRuntimeFile('active-plan.json', serializedPlan);
  }

  private async appendPlanHistory(review: RuntimePlanReview): Promise<void> {
    const existingContent = await this.persistence.readRuntimeFile('plan-history.md');
    const base = existingContent?.trim() || '# Plan History';

    const updatedContent = `${base}

## ${review.plan.id} - ${review.plan.title}

Created at: ${review.plan.createdAt}

Review created at: ${review.createdAt}

Review updated at: ${review.updatedAt}

Objective ID: ${review.plan.objectiveId}

Status: ${review.status}

Risk level: ${review.plan.riskLevel}

Validation: ${review.validation.valid ? 'valid' : 'invalid'}

Summary:

${review.plan.summary}

Steps:

${review.plan.steps
  .map((step) => {
    const target = step.target ? `\n- Target: ${step.target}` : '';
    const command = step.command ? `\n- Command: ${step.command}` : '';

    return `### ${step.id} - ${step.title}

- Type: ${step.type}
- Requires approval: ${String(step.requiresApproval)}${target}${command}
- Expected outcome: ${step.expectedOutcome}

${step.description}`;
  })
  .join('\n\n')}
`;

    await this.persistence.writeRuntimeFile('plan-history.md', `${updatedContent.trim()}\n`);
  }
}
