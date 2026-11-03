import { BrainsLanding } from '@/ui/segments/landing/brains-landing';
import { generateMetadataFromSanity } from '@/ui/segments/landing/metadata/metadata';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateMetadataFromSanity('/');
  return metadata;
}

/** The platform's landing: the Fly brain walkthrough, in place of the marketing home page. */
export default function RootPage() {
  return <BrainsLanding />;
}

