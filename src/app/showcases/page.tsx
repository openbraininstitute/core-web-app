import LandingPage from '@/components/LandingPage';
import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { EnumSection } from '@/components/LandingPage/sections/sections';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return generateMetadataFromSanity('/showcases');
}

export default async function ShowcasesPage() {
  return <LandingPage section={EnumSection.Showcases} />;
}
