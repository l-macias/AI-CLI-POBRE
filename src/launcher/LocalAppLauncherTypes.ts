export interface LocalAppLauncherOptions {
  host?: string | undefined;
  apiPort?: number | undefined;
  uiHost?: string | undefined;
  uiPort?: number | undefined;
  uiDir?: string | undefined;
  openBrowser?: boolean | undefined;
  dryRun?: boolean | undefined;
}

export interface LocalAppLauncherResult {
  status: 'started' | 'planned';
  apiUrl: string;
  uiUrl: string;
  uiCommand: string;
  openBrowser: boolean;
}

export interface LocalAppLauncherProcess {
  stop(): Promise<void>;
}
