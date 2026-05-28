export interface LocalAppLauncherOptions {
  host?: string | undefined;
  apiPort?: number | undefined;
  uiHost?: string | undefined;
  uiPort?: number | undefined;
  uiDir?: string | undefined;
  openBrowser?: boolean | undefined;
  dryRun?: boolean | undefined;
}

export type LocalAppLauncherStatus = 'started' | 'planned';

export type LocalAppPreflightStatus = 'passed' | 'failed';

export type LocalAppPreflightIssueSeverity = 'error' | 'warning';

export type LocalAppPreflightIssueCode =
  | 'ui_dir_missing'
  | 'ui_package_missing'
  | 'ui_node_modules_missing'
  | 'api_port_busy'
  | 'ui_port_busy'
  | 'npm_missing';

export interface LocalAppPreflightIssue {
  code: LocalAppPreflightIssueCode;
  severity: LocalAppPreflightIssueSeverity;
  message: string;
  action: string;
}

export interface LocalAppPreflightCheck {
  name: string;
  status: LocalAppPreflightStatus;
  message: string;
}

export interface LocalAppPreflightResult {
  status: LocalAppPreflightStatus;
  checks: LocalAppPreflightCheck[];
  issues: LocalAppPreflightIssue[];
}

export interface LocalAppLauncherResult {
  status: LocalAppLauncherStatus;
  apiUrl: string;
  uiUrl: string;
  uiCommand: string;
  openBrowser: boolean;
  preflight: LocalAppPreflightResult;
}

export interface LocalAppLauncherProcess {
  stop(): Promise<void>;
}

export class LocalAppLauncherError extends Error {
  public readonly result: LocalAppLauncherResult;

  public constructor(message: string, result: LocalAppLauncherResult) {
    super(message);
    this.name = 'LocalAppLauncherError';
    this.result = result;
  }
}
