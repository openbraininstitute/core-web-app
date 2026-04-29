import { notFound } from 'next/navigation';

import LandingPage from '@/ui/segments/landing';
import { DEFAULT_SECTION } from '@/ui/segments/landing/constants';
import { generateMetadataFromSanity } from '@/ui/segments/landing/metadata/metadata';
import { getSection } from '@/ui/segments/landing/utils';

import type { Metadata } from 'next';

export type ParamProps = {
  params: Promise<{ sanitySectionSlug: string }>;
};

export const dynamic = 'force-dynamic';

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
