import { Logger } from '../observability/Logger.js';

export function greet(name: string): string {
  return `Hello ${name}`;
}

export { greet };
