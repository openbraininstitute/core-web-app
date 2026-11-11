'use client';

import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

import { CONNECTIVITY_H5_CACHE } from '@/features/circuit-nodes/connectivity/cache-name';
import { CIRCUIT_H5_CACHE } from '@/features/circuit-nodes/types';
import { NWB_H5_CACHE } from '@/features/ephys-viewer/constants';

/** The project files the viewers keep in the browser, which must not stay for whoever is next. */
const DATA_CACHES = [CIRCUIT_H5_CACHE, CONNECTIVITY_H5_CACHE, NWB_H5_CACHE];

async function clearDataCaches() {
  if (!('caches' in globalThis)) return;
  await Promise.allSettled(DATA_CACHES.map((name) => caches.delete(name)));
}

export default function Logout() {
  useEffect(() => {
    clearDataCaches().finally(() => signOut({ callbackUrl: '/' }));
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
