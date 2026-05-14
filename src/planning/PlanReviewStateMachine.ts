import type {
  PlanValidationResult,
  RuntimePlan,
  RuntimePlanReview,
} from '../types/PlanningTypes.js';
import { ZeroRuntimeError } from '../utils/errors.js';

export class PlanReviewStateMachine {
  public createGenerated(plan: RuntimePlan): RuntimePlanReview {
    const timestamp = new Date().toISOString();

    return {
      plan,
      status: 'generated',
      validation: {
        valid: false,
        issues: [],
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  public markValidated(
    review: RuntimePlanReview,
    validation: PlanValidationResult,
  ): RuntimePlanReview {
    this.assertStatus(review, ['generated']);

    if (!validation.valid) {
      return this.reject(review, validation, 'Plan failed runtime validation.');
    }

    return {
      ...review,
      status: 'validated',
      validation,
      updatedAt: new Date().toISOString(),
    };
  }

  public reject(
    review: RuntimePlanReview,
    validation: PlanValidationResult,
    reason: string,
  ): RuntimePlanReview {
    this.assertStatus(review, ['generated', 'validated']);

    const timestamp = new Date().toISOString();

    return {
      ...review,
      status: 'rejected',
      validation,
      updatedAt: timestamp,
      rejectedAt: timestamp,
      rejectionReason: reason,
    };
  }

  public approve(review: RuntimePlanReview): RuntimePlanReview {
    this.assertStatus(review, ['validated']);

    const timestamp = new Date().toISOString();

    return {
      ...review,
      status: 'approved',
      updatedAt: timestamp,
      approvedAt: timestamp,
    };
  }

  public markReadyForExecution(review: RuntimePlanReview): RuntimePlanReview {
    this.assertStatus(review, ['approved']);

    const timestamp = new Date().toISOString();

    return {
      ...review,
      status: 'ready_for_execution',
      updatedAt: timestamp,
      readyAt: timestamp,
    };
  }

  private assertStatus(
    review: RuntimePlanReview,
    allowedStatuses: RuntimePlanReview['status'][],
  ): void {
    if (!allowedStatuses.includes(review.status)) {
      throw new ZeroRuntimeError(`Invalid plan review transition from "${review.status}".`, {
        code: 'INVALID_PLAN_REVIEW_TRANSITION',
        cause: {
          currentStatus: review.status,
          allowedStatuses,
          planId: review.plan.id,
        },
      });
    }
  }
}
