import LandingPage from '@/ui/segments/landing';
import { generateWebsiteMetadata } from '@/ui/segments/landing/metadata/metadata';
import { EnumSection } from '@/ui/segments/landing/sections/sections';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return generateWebsiteMetadata('/showcases');
}

export default async function ShowcasesPage() {
  return <LandingPage section={EnumSection.Showcases} />;
}
