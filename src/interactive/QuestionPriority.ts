export type QuestionPriority = 'low' | 'medium' | 'high';

export function compareQuestionPriority(a: QuestionPriority, b: QuestionPriority): number {
  const weight: Record<QuestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return weight[a] - weight[b];
}
