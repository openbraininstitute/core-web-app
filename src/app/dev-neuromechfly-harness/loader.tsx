'use client';

// LOCAL TEST ONLY, remove before committing.
import dynamic from 'next/dynamic';

export const HarnessLoader = dynamic(() => import('./harness').then((m) => m.Harness), {
  ssr: false,
});
