import type { AgentAction, AgentLoopState } from './AgentTypes.js';

export class AgentDecisionPresenter {
  public buildDefaultActions(): AgentAction[] {
    const createdAt = new Date().toISOString();

    return [
      this.action(
        'inspect_project',
        'Inspect project',
        'Inspect target project in read-only mode.',
        false,
        createdAt,
      ),
      this.action(
        'validate_project',
        'Validate project',
        'Run controlled validation to collect findings.',
        false,
        createdAt,
      ),
      this.action(
        'check_git',
        'Check git status',
        'Capture git boundary and working tree safety.',
        false,
        createdAt,
      ),
      this.action(
        'build_repair_context',
        'Build repair context',
        'Build repair request from findings and target files.',
        false,
        createdAt,
      ),
      this.action(
        'request_repair_proposal',
        'Request repair proposal',
        'Ask configured provider for a patch proposal through runtime policy.',
        false,
        createdAt,
      ),
      this.action(
        'show_diff_preview',
        'Show diff preview',
        'Generate and present diff preview.',
        false,
        createdAt,
      ),
      this.action(
        'request_approval',
        'Request approval',
        'Ask user approval before any controlled write.',
        true,
        createdAt,
      ),
      this.action(
        'apply_patch',
        'Apply patch',
        'Apply patch only after explicit approval.',
        true,
        createdAt,
      ),
      this.action(
        'revalidate_project',
        'Revalidate project',
        'Run validation again after patch.',
        false,
        createdAt,
      ),
      this.action('report_result', 'Report result', 'Write final loop report.', false, createdAt),
    ];
  }

  public toText(state: AgentLoopState): string {
    const actions = state.actions
      .map((action, index) => {
        return `${index + 1}. [${action.status}] ${action.label} — ${action.description}`;
      })
      .join('\n');

    return `Zero Runtime agent loop

Status: ${state.status}
Project: ${state.projectName}
Root: ${state.projectRoot}
Objective: ${state.objective}

Actions:
${actions || '- none'}`;
  }

  private action(
    kind: AgentAction['kind'],
    label: string,
    description: string,
    requiresApproval: boolean,
    createdAt: string,
  ): AgentAction {
    return {
      id: `agent-action-${kind}`,
      kind,
      label,
      description,
      status: 'pending',
      requiresApproval,
      createdAt,
    };
  }
}
