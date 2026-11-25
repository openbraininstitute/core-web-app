'use client';

import { MotionConfig } from 'motion/react';
import { SessionProvider } from 'next-auth/react';

import { defaultFlags } from '@/features/feature-flags/config';
import { FlagsProvider } from '@/features/feature-flags/provider';
import { QueryProvider } from '@/query-provider/client';

import type { ReactNode } from 'react';

/** Public marketing content does not initialize platform state or fetch a visitor's session.
 * The platform establishes the real session after the visitor follows a CTA. */
export function PublicLandingProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SessionProvider session={null} refetchOnWindowFocus={false}>
        <FlagsProvider flags={defaultFlags}>
          <QueryProvider>{children}</QueryProvider>
        </FlagsProvider>
      </SessionProvider>
    </MotionConfig>
  );
}
