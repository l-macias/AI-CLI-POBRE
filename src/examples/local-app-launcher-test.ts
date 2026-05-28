import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LocalAppLauncher } from '../launcher/LocalAppLauncher.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const uiDir = join('.runtime', 'local-app-launcher-test', 'ui');

await rm('.runtime/local-app-launcher-test', {
  recursive: true,
  force: true,
});

await mkdir(join(uiDir, 'node_modules'), {
  recursive: true,
});

await writeFile(
  join(uiDir, 'package.json'),
  JSON.stringify(
    {
      scripts: {
        dev: 'vite',
      },
    },
    null,
    2,
  ),
);

const launcher = new LocalAppLauncher();

const result = await launcher.start({
  host: '127.0.0.1',
  apiPort: 17871,
  uiHost: '127.0.0.1',
  uiPort: 5173,
  uiDir,
  openBrowser: false,
  dryRun: true,
});

assert(result.status === 'planned', 'dry run should only plan launcher');
assert(result.apiUrl === 'http://127.0.0.1:17871', 'api url should match');
assert(result.uiUrl === 'http://127.0.0.1:5173', 'ui url should match');
assert(result.uiCommand.includes('npm run dev'), 'ui command should start Vite');
assert(result.openBrowser === false, 'openBrowser should be false');
assert(result.preflight.status === 'passed', 'preflight should pass');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'local-app-launcher-test',
      launcher: result,
    },
    null,
    2,
  ),
);
