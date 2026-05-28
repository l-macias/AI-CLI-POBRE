import type { SessionReport } from './SessionReportBuilder.js';

export class MarkdownReportExporter {
  public export(report: SessionReport): string {
    return [
      `# Zero Runtime Session Report`,
      ``,
      `## Executive Summary`,
      ``,
      `- Session ID: \`${report.sessionId}\``,
      `- Project: ${report.projectName}`,
      `- Project root: \`${report.projectRoot}\``,
      `- Status: ${report.status}`,
      `- Goal: ${report.goal}`,
      `- Generated at: ${report.generatedAt}`,
      ``,
      `## Metrics`,
      ``,
      `| Metric | Value |`,
      `| --- | ---: |`,
      `| Messages | ${report.summary.messages} |`,
      `| Runtime actions | ${report.summary.runtimeActions} |`,
      `| Timeline events | ${report.summary.timelineEvents} |`,
      `| Decisions | ${report.summary.decisions} |`,
      `| Question answers | ${report.summary.questionAnswers} |`,
      `| Tasks | ${report.summary.tasks} |`,
      `| Completed tasks | ${report.summary.completedTasks} |`,
      `| Verify runs | ${report.summary.verifyRuns} |`,
      `| Failed verify runs | ${report.summary.failedVerifyRuns} |`,
      `| Sandbox results | ${report.summary.sandboxResults} |`,
      `| Failed sandbox results | ${report.summary.failedSandboxResults} |`,
      `| Patch recoveries | ${report.summary.patchRecoveries} |`,
      `| Recovery attempts | ${report.summary.recoveryAttempts} |`,
      ``,
      this.sectionMessages(report),
      this.sectionRuntimeActions(report),
      this.sectionTimeline(report),
      this.sectionDecisions(report),
      this.sectionQuestionAnswers(report),
      this.sectionTasks(report),
      this.sectionVerifyRuns(report),
      this.sectionSandboxResults(report),
      this.sectionPatchRecoveries(report),
    ].join('\n');
  }

  private sectionMessages(report: SessionReport): string {
    if (report.messages.length === 0) {
      return ['## Messages', '', '_No messages recorded._', ''].join('\n');
    }

    return [
      `## Messages`,
      ``,
      ...report.messages.flatMap((message) => [
        `### ${message.role} — ${message.createdAt}`,
        ``,
        message.content,
        ``,
      ]),
    ].join('\n');
  }

  private sectionRuntimeActions(report: SessionReport): string {
    if (report.runtimeActions.length === 0) {
      return ['## Runtime Actions', '', '_No runtime actions recorded._', ''].join('\n');
    }

    return [
      `## Runtime Actions`,
      ``,
      `| Status | Title | Description | Created at |`,
      `| --- | --- | --- | --- |`,
      ...report.runtimeActions.map((action) => {
        return `| ${this.escape(action.status)} | ${this.escape(action.title)} | ${this.escape(
          action.description,
        )} | ${this.escape(action.createdAt)} |`;
      }),
      ``,
    ].join('\n');
  }

  private sectionTimeline(report: SessionReport): string {
    if (report.timeline.length === 0) {
      return ['## Timeline', '', '_No timeline events recorded._', ''].join('\n');
    }

    return [
      `## Timeline`,
      ``,
      `| Kind | Message | Created at |`,
      `| --- | --- | --- |`,
      ...report.timeline.map((event) => {
        return `| ${this.escape(event.kind)} | ${this.escape(event.message)} | ${this.escape(event.createdAt)} |`;
      }),
      ``,
    ].join('\n');
  }

  private sectionDecisions(report: SessionReport): string {
    if (report.decisions.length === 0) {
      return ['## Decisions', '', '_No session decisions recorded._', ''].join('\n');
    }

    return [
      `## Decisions`,
      ``,
      `| Category | Strength | Statement | Source | Created at |`,
      `| --- | --- | --- | --- | --- |`,
      ...report.decisions.map((decision) => {
        return `| ${this.escape(decision.category)} | ${this.escape(decision.strength)} | ${this.escape(
          decision.statement,
        )} | ${this.escape(decision.source)} | ${this.escape(decision.createdAt)} |`;
      }),
      ``,
    ].join('\n');
  }
  private sectionQuestionAnswers(report: SessionReport): string {
    if (report.questionAnswers.length === 0) {
      return ['## Question Answers', '', '_No runtime question answers recorded._', ''].join('\n');
    }

    return [
      `## Question Answers`,
      ``,
      `| Question ID | Answer | Answered at |`,
      `| --- | --- | --- |`,
      ...report.questionAnswers.map((answer) => {
        return `| ${this.escape(answer.questionId)} | ${this.escape(answer.answer)} | ${this.escape(
          answer.answeredAt,
        )} |`;
      }),
      ``,
    ].join('\n');
  }
  private sectionTasks(report: SessionReport): string {
    if (report.tasks.length === 0) {
      return ['## Tasks', '', '_No tasks recorded._', ''].join('\n');
    }

    return [
      `## Tasks`,
      ``,
      `| Status | Kind | Title | Dependencies | Updated at |`,
      `| --- | --- | --- | --- | --- |`,
      ...report.tasks.map((task) => {
        return `| ${this.escape(task.status)} | ${this.escape(task.kind)} | ${this.escape(
          task.title,
        )} | ${this.escape(task.dependencies.join(', ') || '-')} | ${this.escape(task.updatedAt)} |`;
      }),
      ``,
    ].join('\n');
  }

  private sectionVerifyRuns(report: SessionReport): string {
    if (report.verifyRuns.length === 0) {
      return ['## Verify Runs', '', '_No verify commands recorded._', ''].join('\n');
    }

    return [
      `## Verify Runs`,
      ``,
      `| Status | Command | Exit code | Duration ms |`,
      `| --- | --- | ---: | ---: |`,
      ...report.verifyRuns.map((run) => {
        return `| ${this.escape(run.status)} | \`${this.escape(run.command)}\` | ${
          run.exitCode ?? '-'
        } | ${run.durationMs} |`;
      }),
      ``,
      ...report.verifyRuns.flatMap((run, index) => [
        `### Verify output ${index + 1}: \`${run.command}\``,
        ``,
        `**stdout**`,
        ``,
        '```txt',
        run.stdoutSummary,
        '```',
        ``,
        `**stderr**`,
        ``,
        '```txt',
        run.stderrSummary,
        '```',
        ``,
      ]),
    ].join('\n');
  }
  private sectionSandboxResults(report: SessionReport): string {
    if (report.sandboxResults.length === 0) {
      return ['## Sandbox Results', '', '_No sandbox results recorded._', ''].join('\n');
    }

    return [
      `## Sandbox Results`,
      ``,
      `| Status | Proposal ID | Verify runs | Issues | Completed at |`,
      `| --- | --- | ---: | ---: | --- |`,
      ...report.sandboxResults.map((result) => {
        return `| ${this.escape(result.status)} | \`${this.escape(result.proposalId)}\` | ${
          result.verifyRuns.length
        } | ${result.issues.length} | ${this.escape(result.completedAt)} |`;
      }),
      ``,
      ...report.sandboxResults.flatMap((result, index) => [
        `### Sandbox result ${index + 1}: \`${result.id}\``,
        ``,
        `- Status: ${result.status}`,
        `- Proposal ID: \`${result.proposalId}\``,
        `- Apply status: ${result.applyResult?.status ?? 'not_applied'}`,
        `- Workspace: \`${result.workspace?.workspaceRoot ?? 'n/a'}\``,
        ``,
        ...(result.issues.length > 0
          ? [
              `**Issues**`,
              ``,
              ...result.issues.map((issue) => `- ${issue.code}: ${issue.message}`),
              ``,
            ]
          : []),
      ]),
    ].join('\n');
  }

  private sectionPatchRecoveries(report: SessionReport): string {
    if (report.patchRecoveries.length === 0) {
      return ['## Patch Recoveries', '', '_No patch recoveries recorded._', ''].join('\n');
    }

    return [
      `## Patch Recoveries`,
      ``,
      `| Status | Proposal ID | Attempt | Max attempts | Issues | Created at |`,
      `| --- | --- | ---: | ---: | ---: | --- |`,
      ...report.patchRecoveries.map((recovery) => {
        return `| ${this.escape(recovery.status)} | \`${this.escape(recovery.proposalId)}\` | ${
          recovery.currentAttempt
        } | ${recovery.maxAttempts} | ${recovery.issues.length} | ${this.escape(
          recovery.createdAt,
        )} |`;
      }),
      ``,
      ...report.patchRecoveries.flatMap((recovery, index) => [
        `### Patch recovery ${index + 1}: \`${recovery.id}\``,
        ``,
        `- Status: ${recovery.status}`,
        `- Proposal ID: \`${recovery.proposalId}\``,
        `- Attempts: ${recovery.currentAttempt}/${recovery.maxAttempts}`,
        ``,
        ...recovery.attempts.flatMap((attempt) => [
          `#### Attempt ${attempt.attemptNumber}`,
          ``,
          `- Sandbox result: \`${attempt.sandboxResultId}\``,
          `- Failure report: \`${attempt.failureReport.id}\``,
          `- Summary: ${attempt.failureReport.summary}`,
          `- Failed files: ${attempt.failureReport.failedFiles.join(', ') || '-'}`,
          ``,
          `**Repair prompt**`,
          ``,
          '```txt',
          attempt.repairPrompt.user,
          '```',
          ``,
        ]),
      ]),
    ].join('\n');
  }
  private escape(value: string): string {
    return value.replaceAll('|', '\\|').replaceAll('\n', '<br />');
  }
}
