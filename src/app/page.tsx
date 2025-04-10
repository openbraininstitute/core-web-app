import { Metadata } from 'next';

import LandingPage from '@/components/LandingPage';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateMetadataFromSanity('/');
  return metadata;
}

export default async function RootPage(props: {
  searchParams: Promise<{ errorcode: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  return <LandingPage section={EnumSection.Home} errorCode={searchParams.errorcode} />;
}
