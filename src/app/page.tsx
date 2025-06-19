import { Metadata } from 'next';

import LandingPage from '@/components/LandingPage';
import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { EnumSection } from '@/components/LandingPage/sections/sections';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateMetadataFromSanity('/');
  return metadata;
}

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ errorcode: string | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <LandingPage section={EnumSection.Home} errorCode={resolvedSearchParams.errorcode} />;
}
