import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

export const projectRoot = path.resolve(currentDirPath, "../..");

export function fromRoot(...segments: string[]): string {
  return path.join(projectRoot, ...segments);
}
