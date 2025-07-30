import { notFound } from 'next/navigation';
import compact from 'lodash/compact';

import type { Metadata } from 'next';

import LandingPage from '@/components/LandingPage';

import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { DEFAULT_SECTION, SECTIONS } from '@/components/LandingPage/constants';
import { fetchSanityPageContent } from '@/services/sanity/sanity';
import { getSection } from '@/components/LandingPage/utils';

export type ParamProps = {
  params: Promise<{ sanitySectionSlug: string }>;
};

export async function generateMetadata(props: ParamProps): Promise<Metadata> {
  const params = await props.params;
  const metadata = await generateMetadataFromSanity(params.sanitySectionSlug);
  return metadata;
}

export async function generateStaticParams() {
  const paths = compact(
    SECTIONS.map((section) => ({
      sanitySectionSlug: section.slug.split('/').pop(),
    }))
  );
  return paths;
}

export const dynamicParams = true;
export const dynamic = 'force-static';

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

  const content = await fetchSanityPageContent(sanitySection);
  return <LandingPage section={sanitySection.index} content={content} />;
}
