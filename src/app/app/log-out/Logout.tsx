'use client';

import { useEffect } from 'react';

import { signOut } from '@/features/auth/client';
import { log } from '@/utils/logger';
import { clearProjectDataCaches } from '@/utils/project-data-caches';

async function clearLogbookCopies() {
  const { dropCleanCopies } = await import('@/features/logbook/collaboration/local-sync');
  await dropCleanCopies();
}

/**
 * How long signing out waits for the caches to go: gigabytes of them can take a while. The marker of whose they are is
 * left as it is, so that whatever is left is deleted when someone else signs in.
 */
const CLEAR_TIMEOUT_MS = 2000;

export default function Logout() {
  useEffect(() => {
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, CLEAR_TIMEOUT_MS));
    const cleared = Promise.allSettled([clearProjectDataCaches(), clearLogbookCopies()]);
    Promise.race([cleared, timeout])
      .then(() => signOut())
      .then(() => window.location.assign('/'))
      .catch((error) => log('error', 'sign-out failed', error));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Logging you out</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we securely sign you out and redirect you to the home page.
      </p>
    </div>
  );
}
