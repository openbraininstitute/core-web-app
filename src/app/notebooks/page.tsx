import LandingPage from '@/ui/segments/landing';
import { generateMetadataFromSanity } from '@/ui/segments/landing/metadata/metadata';
import { EnumSection } from '@/ui/segments/landing/sections/sections';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateMetadataFromSanity('notebooks');
  return metadata;
}

export default function NotebooksPage() {
  return <LandingPage section={EnumSection.Notebooks} />;
}
