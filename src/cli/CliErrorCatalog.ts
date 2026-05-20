import type { CliParseIssue } from './CliTypes.js';

export interface CliErrorCatalogEntry {
  readonly code: string;
  readonly title: string;
  readonly suggestion: string;
  readonly example?: string | undefined;
}

const entries: readonly CliErrorCatalogEntry[] = [
  {
    code: 'CLI_UNKNOWN_COMMAND',
    title: 'Unknown command.',
    suggestion: 'Run the help command to see available commands.',
    example: 'zero help',
  },
  {
    code: 'CLI_INVALID_FORMAT',
    title: 'Invalid output format.',
    suggestion: 'Use one of the supported output formats.',
    example: 'zero status --format text',
  },
  {
    code: 'CLI_PROJECT_PATH_REQUIRED',
    title: 'Missing project path.',
    suggestion: 'Provide the target project path.',
    example: 'zero project add --path ./target --name "Target Project"',
  },
  {
    code: 'CLI_PROJECT_NAME_REQUIRED',
    title: 'Missing project name.',
    suggestion: 'Provide a stable project name.',
    example: 'zero project add --path ./target --name "Target Project"',
  },
  {
    code: 'CLI_PROJECT_REF_REQUIRED',
    title: 'Missing project reference.',
    suggestion: 'Provide a project name or id.',
    example: 'zero project use "Target Project"',
  },
  {
    code: 'CLI_PATCH_PROPOSAL_REQUIRED',
    title: 'Missing patch proposal.',
    suggestion: 'Provide the patch proposal JSON path.',
    example: 'zero patch apply --proposal .runtime/proposal.json --confirm-apply',
  },
  {
    code: 'CLI_PATCH_CONFIRM_APPLY_REQUIRED',
    title: 'Patch apply confirmation required.',
    suggestion: 'Re-run the command only after reviewing the proposal and diff.',
    example: 'zero patch apply --proposal .runtime/proposal.json --confirm-apply',
  },
  {
    code: 'CLI_AGENT_STEP_REQUIRED',
    title: 'Missing agent step.',
    suggestion: 'Provide a valid agent step kind.',
    example: 'zero agent step inspect_project --project ./target',
  },
  {
    code: 'CLI_AGENT_APPROVAL_ID_REQUIRED',
    title: 'Missing approval id.',
    suggestion: 'List approvals first, then approve or reject a specific id.',
    example: 'zero agent approvals --project ./target',
  },
  {
    code: 'CLI_AGENT_CONFIRM_RESET_REQUIRED',
    title: 'Agent reset confirmation required.',
    suggestion: 'Only reset after confirming you want to remove current loop state.',
    example: 'zero agent reset --project ./target --confirm-reset',
  },
  {
    code: 'CLI_AGENT_REAL_PROVIDER_OPT_IN_REQUIRED',
    title: 'Real provider opt-in required.',
    suggestion: 'Add explicit real provider approval if you intend to call OpenRouter.',
    example: 'zero agent start --provider openrouter --model <model> --allow-real-provider',
  },
  {
    code: 'CLI_REPAIR_REAL_PROVIDER_OPT_IN_REQUIRED',
    title: 'Real provider opt-in required.',
    suggestion: 'Add explicit real provider approval if you intend to call OpenRouter.',
    example: 'zero repair --provider openrouter --model <model> --allow-real-provider',
  },
  {
    code: 'CLI_SCAFFOLD_NAME_REQUIRED',
    title: 'Missing module name.',
    suggestion: 'Provide the module name.',
    example: 'zero scaffold module --name auth --target src/modules',
  },
  {
    code: 'CLI_SCAFFOLD_TARGET_REQUIRED',
    title: 'Missing scaffold target.',
    suggestion: 'Provide the target directory.',
    example: 'zero scaffold module --name auth --target src/modules',
  },
  {
    code: 'CLI_SCAFFOLD_REAL_PROVIDER_OPT_IN_REQUIRED',
    title: 'Real provider opt-in required.',
    suggestion: 'Add explicit real provider approval if you intend to call OpenRouter.',
    example:
      'zero scaffold module --name auth --target src/modules --provider openrouter --model <model> --allow-real-provider',
  },
  {
    code: 'CLI_SCAFFOLD_PROVIDER_MODEL_REQUIRED',
    title: 'Missing provider model.',
    suggestion: 'Provide the OpenRouter model id.',
    example:
      'zero scaffold module --name auth --target src/modules --provider openrouter --model poolside/laguna-xs.2:free --allow-real-provider',
  },
  {
    code: 'CLI_COMMAND_FAILED',
    title: 'Command failed.',
    suggestion: 'Read the error message and re-run with corrected input.',
  },
];

export class CliErrorCatalog {
  private readonly entriesByCode = new Map<string, CliErrorCatalogEntry>(
    entries.map((entry) => [entry.code, entry]),
  );

  public find(issue: CliParseIssue): CliErrorCatalogEntry | undefined {
    return this.entriesByCode.get(issue.code);
  }
}
