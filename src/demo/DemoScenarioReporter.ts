import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { DemoScenarioResult } from './DemoScenarioRunner.js';

export interface DemoScenarioReporterInput {
  readonly reportPath: string;
  readonly result: DemoScenarioResult;
}

export class DemoScenarioReporter {
  public async write(input: DemoScenarioReporterInput): Promise<string> {
    const reportPath = resolve(input.reportPath);

    await mkdir(dirname(reportPath), {
      recursive: true,
    });

    await writeFile(reportPath, this.render(input.result), 'utf8');

    return reportPath;
  }

  private render(result: DemoScenarioResult): string {
    return `# Zero Runtime Quickstart Report

## Purpose

This report documents a deterministic onboarding run. It proves that the CLI can scaffold a module proposal, dry-run a patch, apply it through the runtime patch path, validate the generated project, and capture git audit state.

## Summary

- Status: ${result.status}
- Project root: ${result.projectRoot}
- Proposal path: ${result.proposalPath}
- Report path: ${result.reportPath}
- Scaffold status: ${result.scaffoldStatus}
- Dry-run status: ${result.dryRunStatus}
- Apply status: ${result.applyStatus}
- Validation status: ${result.validationStatus}
- Git working tree: ${result.gitWorkingTreeStatus}

## Generated files

${this.renderList(result.generatedFiles)}

## Changed files

${this.renderList(result.changedFiles)}

## Equivalent commands

\`\`\`bash
zero scaffold module --project "${result.projectRoot}" --name auth --kind backend --target src/modules/auth --provider fake-llm --save-proposal .runtime/proposals/auth-module.patch-proposal.json
zero patch apply --project "${result.projectRoot}" --proposal "${result.proposalPath}" --dry-run --allow-dirty
zero patch apply --project "${result.projectRoot}" --proposal "${result.proposalPath}" --confirm-apply --allow-dirty
zero validate --project "${result.projectRoot}" --target src/index.ts --target src/modules/auth/index.ts --target src/modules/auth/auth.service.ts --target src/modules/auth/auth.types.ts --name "Zero Runtime Quickstart Demo" --objective "Validate generated quickstart module after controlled patch application."
zero git status --project "${result.projectRoot}"
\`\`\`

## Safety notes

- The runtime remains the authority.
- This quickstart uses the deterministic fake provider.
- No real provider call is made.
- No premium model is used.
- The provider does not directly write files.
- A patch proposal is saved before application.
- A dry-run is executed before apply.
- Patch application goes through the runtime patch-apply path.
- Validation runs after apply.
- Git status is captured after validation for auditability.
- The flow is auditable through this report and the saved proposal.

## Recommended next steps

- Review the changed files.
- Inspect the saved patch proposal.
- Run git diff before keeping or reverting the generated demo output.
- Use zero agent start for a real approval-gated workflow.
`;
  }

  private renderList(values: readonly string[]): string {
    if (values.length === 0) {
      return '- none';
    }

    return values.map((value) => `- ${value}`).join('\n');
  }
}
