import { Suspense } from 'react';

import { BrainsLanding } from '@/ui/segments/landing/brains-landing';
import { LandingFirstPaint } from '@/ui/segments/landing/landing-first-paint';
import { generateWebsiteMetadata } from '@/ui/segments/landing/metadata/metadata';

import type { Metadata } from 'next';

// Runtime configuration is injected by the root layout. Build-time rendering
// would serialize the config module's build placeholder instead of deployment values.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateWebsiteMetadata('/');
  return metadata;
}

/** The platform's landing: the Fly brain walkthrough, in place of the marketing home page. */
export default function RootPage() {
  // The logo and words go out in the first HTML, not held back with the landing while it waits on the session.
  return (
    <>
      <LandingFirstPaint />
      <Suspense fallback={null}>
        <BrainsLanding />
      </Suspense>
    </>
  );
}
