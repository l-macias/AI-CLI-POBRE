import type { RuntimeSessionState } from '../types/SessionTypes.js';

export class CurrentStateGenerator {
  public generate(state: RuntimeSessionState): string {
    return `# Current State

## Project

${state.projectName}

## Current Session

${state.sessionName}

## Current Objective

${state.objective}

## Active Module

${state.activeModule}

## Runtime Status

${state.status}

## Completed

${this.renderList(state.completed)}

## In Progress

${this.renderList(state.inProgress)}

## Pending

${this.renderList(state.pending)}

## Known Issues

${this.renderList(state.knownIssues)}
`;
  }

  private renderList(items: string[]): string {
    if (items.length === 0) {
      return '- None';
    }

    return items.map((item) => `- ${item}`).join('\n');
  }
}
