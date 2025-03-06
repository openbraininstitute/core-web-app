import { Metadata } from 'next';

import LandingPage from '@/components/LandingPage';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { client } from '@/components/LandingPage/content/content';
import { comingSoonDataSchema } from '@/types/common';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateMetadataFromSanity('/');
  return metadata;
}

export default async function RootPage({
  searchParams,
}: {
  searchParams: { errorcode: string | undefined };
}) {
  const popUpContentRes = await client.fetch(`*[slug.current == "releasing-soon"][0]`);
  const popUpData = comingSoonDataSchema.parse(popUpContentRes);

  return (
    <LandingPage
      section={EnumSection.Home}
      errorCode={searchParams.errorcode}
      popUpData={popUpData}
    />
  );
}
