import { Metadata } from 'next';

import LandingPage from '@/components/LandingPage';
import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { EnumSection } from '@/components/LandingPage/sections/sections';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateMetadataFromSanity('notebooks');
  return metadata;
}

export default function NotebooksPage() {
  return <LandingPage section={EnumSection.Notebooks} />;
}
