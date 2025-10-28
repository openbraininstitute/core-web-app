import { Metadata } from 'next';

import LandingPage from '@/components/LandingPage';
import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { EnumSection } from '@/components/LandingPage/sections/sections';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateMetadataFromSanity('/');
  return metadata;
}

export default async function RootPage({
  searchParams: promisedParams,
}: {
  searchParams: Promise<{
    errorcode: string | undefined;
    original_code: string | undefined;
    description: string | undefined;
  }>;
}) {
  const searchParams = await promisedParams;
  return (
    <LandingPage
      section={EnumSection.Home}
      error={{
        errorcode: searchParams.errorcode,
        original_code: searchParams.original_code,
        description: searchParams.description,
      }}
    />
  );
}
