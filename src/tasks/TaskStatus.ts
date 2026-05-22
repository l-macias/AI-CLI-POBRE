export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'waiting_user'
  | 'blocked'
  | 'completed'
  | 'cancelled';

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === 'blocked' || status === 'completed' || status === 'cancelled';
}

export function canTransitionTaskStatus(input: { from: TaskStatus; to: TaskStatus }): boolean {
  if (input.from === input.to) {
    return true;
  }

  if (isTerminalTaskStatus(input.from)) {
    return false;
  }

  if (input.from === 'pending') {
    return (
      input.to === 'in_progress' ||
      input.to === 'waiting_user' ||
      input.to === 'blocked' ||
      input.to === 'cancelled'
    );
  }

  if (input.from === 'in_progress') {
    return (
      input.to === 'waiting_user' ||
      input.to === 'blocked' ||
      input.to === 'completed' ||
      input.to === 'cancelled'
    );
  }

  if (input.from === 'waiting_user') {
    return input.to === 'in_progress' || input.to === 'blocked' || input.to === 'cancelled';
  }

  return false;
}
