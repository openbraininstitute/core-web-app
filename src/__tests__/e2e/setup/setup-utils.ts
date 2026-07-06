import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CleanupLogger } from '../fixtures/virtual-lab-cleanup';

export const AUTH_STATE_PATH = path.resolve(
  process.cwd(),
  process.env.E2E_AUTH_STATE_PATH ?? '.auth/user.json'
);

export const E2E_RUN_DIR = process.env.E2E_RUN_DIR
  ? path.resolve(process.cwd(), process.env.E2E_RUN_DIR)
  : null;

export function createCleanupLogger(prefix: string): CleanupLogger {
  return {
    info(message) {
      process.stdout.write(`[${prefix}] ${message}\n`);
    },
    warn(message) {
      process.stderr.write(`[${prefix}] ${message}\n`);
    },
  };
}

export function ensureParentDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function removeFileIfExists(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore missing files.
  }
}

export function removeRunDirectory(): void {
  if (E2E_RUN_DIR) {
    fs.rmSync(E2E_RUN_DIR, { recursive: true, force: true });
  }
}
