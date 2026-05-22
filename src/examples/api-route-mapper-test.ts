import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ExpressRouteScanner } from '../intelligence/api/ExpressRouteScanner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/api-route-mapper-test');
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

await writeFile(
  path.join(projectRoot, 'src', 'routes', 'profileRoutes.ts'),
  [
    "import { Router } from 'express';",
    "import { updateProfile, getProfile } from '../controllers/profileController';",
    "import { authMiddleware } from '../middlewares/authMiddleware';",
    "import { uploadMiddleware } from '../middlewares/uploadMiddleware';",
    '',
    'const router = Router();',
    '',
    "router.get('/api/profile', authMiddleware, getProfile);",
    "router.post('/api/profile', authMiddleware, uploadMiddleware, updateProfile);",
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
  path.join(projectRoot, 'src', 'middlewares', 'uploadMiddleware.ts'),
  'export function uploadMiddleware() { return true; }\n',
  'utf8',
);

const scanner = new ExpressRouteScanner();
const routeMap = await scanner.scan(projectRoot);

assert(routeMap.routes.length === 2, 'should detect two routes');

const getRoute = routeMap.routes.find((route) => route.method === 'GET');

if (!getRoute) {
  throw new Error('GET route should exist');
}

assert(getRoute.path === '/api/profile', 'GET route path should match');
assert(getRoute.controller?.name === 'getProfile', 'GET controller should resolve');
assert(
  getRoute.controller?.resolvedFile === 'src/controllers/profileController.ts',
  'GET controller file should resolve',
);
assert(getRoute.middlewares.length === 1, 'GET route should detect one middleware');
assert(getRoute.middlewares[0]?.name === 'authMiddleware', 'GET middleware should resolve');

const postRoute = routeMap.routes.find((route) => route.method === 'POST');

if (!postRoute) {
  throw new Error('POST route should exist');
}

assert(postRoute.path === '/api/profile', 'POST route path should match');
assert(postRoute.controller?.name === 'updateProfile', 'POST controller should resolve');
assert(postRoute.middlewares.length === 2, 'POST route should detect two middlewares');
assert(
  postRoute.middlewares.some((middleware) => middleware.name === 'uploadMiddleware'),
  'POST route should detect upload middleware',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'api-route-mapper-test',
      routes: routeMap.routes.map((route) => ({
        method: route.method,
        path: route.path,
        sourceFile: route.sourceFile,
        controller: route.controller,
        middlewares: route.middlewares,
      })),
      routeFiles: routeMap.routeFiles,
      controllerFiles: routeMap.controllerFiles,
      middlewareFiles: routeMap.middlewareFiles,
    },
    null,
    2,
  ),
);
