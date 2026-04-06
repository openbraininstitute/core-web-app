import * as fs from 'node:fs';
import * as path from 'node:path';

const E2E_STATE_PATH = path.resolve(process.cwd(), '.e2e-state.json');
const AUTH_STATE_PATH = path.resolve(process.cwd(), '.auth/user.json');

async function globalTeardown() {
  // --- 1. Read state file ---
  let virtualLabId: string;
  let accessToken: string;

  try {
    const raw = fs.readFileSync(E2E_STATE_PATH, 'utf-8');
    const state = JSON.parse(raw);
    virtualLabId = state.virtualLabId;
    accessToken = state.accessToken;
  } catch {
    console.warn(
      '[global-teardown] .e2e-state.json not found or unreadable — skipping virtual lab deletion.'
    );
    return;
  }

  // --- 2. Delete virtual lab ---
  const apiUrl = process.env.VIRTUAL_LAB_API_URL;

  if (apiUrl && virtualLabId && accessToken) {
    try {
      const response = await fetch(`${apiUrl}/virtual-labs/${virtualLabId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        console.warn(
          `[global-teardown] Failed to delete virtual lab ${virtualLabId} ` +
            `(${response.status}). Please delete it manually.`
        );
      } else {
        console.log(`[global-teardown] Deleted virtual lab ${virtualLabId}.`);
      }
    } catch (error) {
      console.warn(
        `[global-teardown] Error deleting virtual lab ${virtualLabId}: ${error}. ` +
          `Please delete it manually.`
      );
    }
  } else {
    console.warn(
      '[global-teardown] Missing API URL, virtualLabId, or accessToken — skipping deletion.'
    );
  }

  // --- 3. Clean up state files ---
  for (const filePath of [E2E_STATE_PATH, AUTH_STATE_PATH]) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore — file may already be absent
    }
  }
}

export default globalTeardown;
