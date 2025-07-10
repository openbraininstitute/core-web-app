import { Metadata } from 'next';

import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { fetchSanityPageContent } from '@/services/sanity';
import LandingPage from '@/components/LandingPage';

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
  const content = await fetchSanityPageContent(EnumSection.Home);

  return (
    <LandingPage content={content} section={EnumSection.Home} errorCode={searchParams.errorcode} />
  );
}
