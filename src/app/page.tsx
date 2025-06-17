import { Metadata } from 'next';

import LandingPage from '@/components/LandingPage';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateMetadataFromSanity('/');
  return metadata;
}

export default async function RootPage({
  searchParams: promisedParams,
}: {
  searchParams: Promise<{ errorcode: string | undefined }>;
}) {
  const searchParams = await promisedParams;
  return <LandingPage section={EnumSection.Home} errorCode={searchParams.errorcode} />;
}
