import { notFound } from 'next/navigation';

import LandingPage from '@/components/LandingPage';
import { DEFAULT_SECTION } from '@/components/LandingPage/constants';
import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { getSection } from '@/components/LandingPage/utils';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export type ParamProps = {
  params: Promise<{ sanitySectionSlug: string }>;
};

export async function generateMetadata(props: ParamProps): Promise<Metadata> {
  const params = await props.params;
  const metadata = await generateMetadataFromSanity(params.sanitySectionSlug);
  return metadata;
}

export default async function SanityContentPage({
  params: promisedParams,
}: {
  params: Promise<{ sanitySectionSlug: string }>;
}) {
  const params = await promisedParams;
  const sanitySection = getSection(params.sanitySectionSlug);

  if (sanitySection.slug === DEFAULT_SECTION.slug) {
    notFound();
  }

  return <LandingPage section={sanitySection.index} />;
}
