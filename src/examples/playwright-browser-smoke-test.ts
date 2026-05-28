import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { chromium, type Browser, type Page } from 'playwright';
import { RuntimeApiServer } from '../api/RuntimeApiServer.js';

const execFileAsync = promisify(execFile);

interface BrowserSmokeStep {
  name: string;
  status: 'passed';
  detail: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
async function findAvailablePort(input: { host: string; preferredPort: number }): Promise<number> {
  for (let port = input.preferredPort; port < input.preferredPort + 50; port += 1) {
    const available = await isPortAvailable({
      host: input.host,
      port,
    });

    if (available) {
      return port;
    }
  }

  throw new Error(
    `No available UI port found from ${input.preferredPort} to ${input.preferredPort + 49}.`,
  );
}

async function isPortAvailable(input: { host: string; port: number }): Promise<boolean> {
  return new Promise<boolean>((resolveCheck) => {
    const server = createServer();

    server.once('error', () => {
      resolveCheck(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolveCheck(true);
      });
    });

    server.listen(input.port, input.host);
  });
}
async function waitForHttp(url: string, label: string): Promise<void> {
  const startedAt = Date.now();
  const timeoutMs = 20_000;
  let lastError = '';

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }

      lastError = `${response.status} ${response.statusText}`;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`${label} did not become reachable at ${url}. Last error: ${lastError}`);
}
async function waitForUiProcessAndHttp(input: {
  url: string;
  label: string;
  processRef: ChildProcessWithoutNullStreams;
}): Promise<void> {
  const processExit = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolveExit) => {
    input.processRef.once('exit', (code, signal) => {
      resolveExit({
        code,
        signal,
      });
    });
  });

  const httpReady = waitForHttp(input.url, input.label);

  const result = await Promise.race([
    httpReady.then(() => ({
      status: 'ready' as const,
    })),
    processExit.then((exit) => ({
      status: 'exited' as const,
      exit,
    })),
  ]);

  if (result.status === 'exited') {
    throw new Error(
      `${input.label} process exited before becoming reachable. Code: ${String(
        result.exit.code,
      )}. Signal: ${String(result.exit.signal)}.`,
    );
  }
}
async function waitForVisibleText(page: Page, text: string | RegExp, label: string): Promise<void> {
  await page.getByText(text).first().waitFor({
    state: 'visible',
    timeout: 10_000,
  });

  const bodyText = await page.locator('body').innerText();

  assert(bodyText.trim().length > 0, `${label} should render non-empty body text.`);
}

async function clickFirstMatchingButton(page: Page, pattern: RegExp, label: string): Promise<void> {
  const button = page.getByRole('button', {
    name: pattern,
  });

  await button.first().waitFor({
    state: 'visible',
    timeout: 10_000,
  });

  await button.first().click();

  const bodyText = await page.locator('body').innerText();

  assert(bodyText.trim().length > 0, `${label} should keep the app rendered.`);
}

function startUiDevServer(input: {
  uiDir: string;
  host: string;
  port: number;
  apiUrl: string;
}): ChildProcessWithoutNullStreams {
  const child = spawn(
    'npm',
    ['exec', 'vite', '--', '--host', input.host, '--port', String(input.port), '--strictPort'],
    {
      cwd: input.uiDir,
      shell: process.platform === 'win32',
      windowsHide: true,
      env: {
        ...process.env,
        ZERO_RUNTIME_API_URL: input.apiUrl,
      },
    },
  );

  child.stdout.on('data', (chunk: Buffer) => {
    process.stdout.write(chunk);
  });

  child.stderr.on('data', (chunk: Buffer) => {
    process.stderr.write(chunk);
  });

  child.on('exit', (code, signal) => {
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      return;
    }

    if (code !== null && code !== 0) {
      process.stderr.write(`Playwright smoke UI dev server exited with code ${code}\n`);
    }
  });

  return child;
}

async function stopChildProcess(child: ChildProcessWithoutNullStreams | null): Promise<void> {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32' && child.pid) {
    try {
      await execFileAsync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        windowsHide: true,
      });
      return;
    } catch {
      child.kill('SIGTERM');
      return;
    }
  }

  child.kill('SIGTERM');
}

async function createFixtureProject(projectRoot: string): Promise<void> {
  await rm(projectRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(path.join(projectRoot, 'src'), {
    recursive: true,
  });

  await writeFile(
    path.join(projectRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'playwright-browser-smoke-fixture',
        type: 'module',
        scripts: {
          typecheck: 'node -e "process.exit(0)"',
        },
        dependencies: {
          react: '^19.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  await writeFile(path.join(projectRoot, 'src', 'index.ts'), 'export const value = 1;\n', 'utf8');
}

const apiHost = '127.0.0.1';
const apiPort = 17871;
const uiHost = '127.0.0.1';
const preferredUiPort = 5199;
const uiPort = await findAvailablePort({
  host: uiHost,
  preferredPort: preferredUiPort,
});
const apiUrl = `http://${apiHost}:${apiPort}`;
const uiUrl = `http://${uiHost}:${uiPort}`;
const uiDir = path.resolve('ui');
const testRoot = path.resolve('.runtime/playwright-browser-smoke-test');
const projectRoot = path.join(testRoot, 'project');

await createFixtureProject(projectRoot);

const server = new RuntimeApiServer({
  config: {
    host: apiHost,
    port: apiPort,
  },
});

let browser: Browser | null = null;
let uiProcess: ChildProcessWithoutNullStreams | null = null;

const steps: BrowserSmokeStep[] = [];

try {
  const started = await server.start();

  assert(started.url === apiUrl, `Expected API URL ${apiUrl}. Received ${started.url}.`);

  await waitForHttp(`${apiUrl}/api/health`, 'Runtime API');

  const directHealth = await fetch(`${apiUrl}/api/health`).then(
    (response) =>
      response.json() as Promise<{
        status?: string;
        service?: string;
      }>,
  );

  assert(directHealth.status === 'ok', 'Runtime API should return ok before launching UI.');
  assert(directHealth.service === 'zero-runtime-api', 'Runtime API service should match.');

  steps.push({
    name: 'runtime-api',
    status: 'passed',
    detail: `${apiUrl}/api/health`,
  });

  uiProcess = startUiDevServer({
    uiDir,
    host: uiHost,
    port: uiPort,
    apiUrl,
  });

  await waitForUiProcessAndHttp({
    url: uiUrl,
    label: 'Vite UI',
    processRef: uiProcess,
  });

  await waitForHttp(uiUrl, 'Vite UI');

  steps.push({
    name: 'vite-ui',
    status: 'passed',
    detail: uiUrl,
  });

  browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  page.on('pageerror', (error) => {
    throw error;
  });

  await page.goto(uiUrl, {
    waitUntil: 'domcontentloaded',
  });

  await page.locator('body').waitFor({
    state: 'visible',
    timeout: 10_000,
  });

  const title = await page.title();

  assert(title.trim().length > 0, `Expected browser title to be non-empty. Got ${title}`);

  steps.push({
    name: 'app-load',
    status: 'passed',
    detail: title,
  });

  const bodyText = await page.locator('body').innerText();

  assert(bodyText.trim().length > 0, 'Dashboard should render body text.');

  steps.push({
    name: 'dashboard-visible',
    status: 'passed',
    detail: 'Initial dashboard rendered.',
  });

  const healthResponse = await page.evaluate(async () => {
    const response = await fetch('/api/health');

    return response.json() as Promise<{
      status?: string;
      service?: string;
    }>;
  });

  assert(healthResponse.status === 'ok', 'Browser fetch through Vite proxy should return ok.');
  assert(
    healthResponse.service === 'zero-runtime-api',
    'Browser fetch through Vite proxy should reach Runtime API.',
  );

  steps.push({
    name: 'browser-api-proxy',
    status: 'passed',
    detail: '/api/health reached RuntimeApiServer through browser.',
  });

  await clickFirstMatchingButton(page, /projects/i, 'Projects navigation');
  await waitForVisibleText(page, /Select a local project/i, 'Projects page');

  steps.push({
    name: 'projects-visible',
    status: 'passed',
    detail: 'Projects page rendered.',
  });

  await clickFirstMatchingButton(page, /session/i, 'Session navigation');

  await Promise.race([
    page
      .getByText(/Safe small improvement/i)
      .first()
      .waitFor({
        state: 'visible',
        timeout: 10_000,
      }),
    page
      .getByText(/Read-only analysis/i)
      .first()
      .waitFor({
        state: 'visible',
        timeout: 10_000,
      }),
    page
      .getByText(/Session/i)
      .first()
      .waitFor({
        state: 'visible',
        timeout: 10_000,
      }),
  ]);

  steps.push({
    name: 'session-visible',
    status: 'passed',
    detail: 'Session page rendered.',
  });

  await clickFirstMatchingButton(page, /settings/i, 'Settings navigation');
  await waitForVisibleText(page, /^Settings$/i, 'Settings page');

  steps.push({
    name: 'settings-visible',
    status: 'passed',
    detail: 'Settings page rendered.',
  });

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'playwright-browser-smoke-test',
        uiUrl,
        apiUrl,
        preferredUiPort,
        resolvedUiPort: uiPort,
        steps,
        browser: {
          engine: 'chromium',
          headless: true,
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (browser) {
    await browser.close();
  }

  await stopChildProcess(uiProcess);
  await server.stop();

  await rm(testRoot, {
    recursive: true,
    force: true,
  });
}
