import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ExpressRouteScanner } from '../intelligence/api/ExpressRouteScanner.js';
import { ApiClientScanner } from '../intelligence/frontend/ApiClientScanner.js';
import { AxiosUsageScanner } from '../intelligence/frontend/AxiosUsageScanner.js';
import { FetchUsageScanner } from '../intelligence/frontend/FetchUsageScanner.js';
import { FrontendBackendLinker } from '../intelligence/frontend/FrontendBackendLinker.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/frontend-api-usage-mapper-test');
const projectRoot = path.join(testRoot, 'project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(projectRoot, 'src', 'routes'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'controllers'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'middlewares'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'api'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'components'), {
  recursive: true,
});

await writeFile(
  path.join(projectRoot, 'src', 'routes', 'profileRoutes.ts'),
  [
    "import { Router } from 'express';",
    "import { updateProfile, getProfile } from '../controllers/profileController';",
    "import { authMiddleware } from '../middlewares/authMiddleware';",
    '',
    'const router = Router();',
    '',
    "router.get('/api/profile', authMiddleware, getProfile);",
    "router.post('/api/profile', authMiddleware, updateProfile);",
    '',
    'export default router;',
    '',
  ].join('\n'),
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'controllers', 'profileController.ts'),
  [
    'export function getProfile() {',
    '  return true;',
    '}',
    '',
    'export function updateProfile() {',
    '  return true;',
    '}',
    '',
  ].join('\n'),
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'middlewares', 'authMiddleware.ts'),
  'export function authMiddleware() { return true; }\n',
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'api', 'profileApi.ts'),
  [
    'export async function getProfile() {',
    "  return fetch('/api/profile');",
    '}',
    '',
    'export async function updateProfile(input: unknown) {',
    "  return fetch('/api/profile', {",
    "    method: 'POST',",
    '    body: JSON.stringify(input),',
    '  });',
    '}',
    '',
    'export const deleteProfile = async () => {',
    "  return api.delete('/api/profile');",
    '}',
    '',
  ].join('\n'),
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'components', 'ProfileEditForm.tsx'),
  [
    "import { updateProfile } from '../api/profileApi';",
    '',
    'export function ProfileEditForm() {',
    '  void updateProfile({ name: "Lucas" });',
    '  return null;',
    '}',
    '',
  ].join('\n'),
  'utf8',
);

const routeMap = await new ExpressRouteScanner().scan(projectRoot);
const fetchScan = await new FetchUsageScanner().scan(projectRoot);
const axiosScan = await new AxiosUsageScanner().scan(projectRoot);
const clientScan = await new ApiClientScanner().scan(projectRoot);
const linked = await new FrontendBackendLinker().link({
  projectRoot,
  routeMap,
});

assert(routeMap.routes.length === 2, 'should detect backend routes');
assert(fetchScan.usages.length === 2, 'should detect two fetch usages');
assert(axiosScan.usages.length === 1, 'should detect one axios/api usage');
assert(clientScan.functions.length >= 3, 'should detect API client functions');
assert(linked.usages.length === 3, 'should link three frontend usages');

assert(
  linked.links.some((link) => link.matchType === 'exact' && link.usage.method === 'GET'),
  'should link GET usage exactly',
);

assert(
  linked.links.some((link) => link.matchType === 'exact' && link.usage.method === 'POST'),
  'should link POST usage exactly',
);

assert(
  linked.links.some(
    (link) => link.matchType === 'method_mismatch' && link.usage.method === 'DELETE',
  ),
  'should detect method mismatch for DELETE usage',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'frontend-api-usage-mapper-test',
      routes: routeMap.routes.map((route) => ({
        method: route.method,
        path: route.path,
        controller: route.controller,
      })),
      usages: linked.usages.map((usage) => ({
        transport: usage.transport,
        method: usage.method,
        endpoint: usage.endpoint,
        sourceFile: usage.sourceFile,
      })),
      links: linked.links.map((link) => ({
        matchType: link.matchType,
        frontend: {
          method: link.usage.method,
          endpoint: link.usage.endpoint,
          sourceFile: link.usage.sourceFile,
        },
        backend: link.route
          ? {
              method: link.route.method,
              path: link.route.path,
              sourceFile: link.route.sourceFile,
              controller: link.route.controller,
            }
          : null,
      })),
    },
    null,
    2,
  ),
);
