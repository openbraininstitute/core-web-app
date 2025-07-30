import { Metadata } from 'next';

import LandingPage from '@/components/LandingPage';

import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { DEFAULT_SECTION } from '@/components/LandingPage/constants';
import { fetchSanityPageContent } from '@/services/sanity';

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
  const content = await fetchSanityPageContent(DEFAULT_SECTION);

  return (
    <LandingPage content={content} section={EnumSection.Home} errorCode={searchParams.errorcode} />
  );
}
