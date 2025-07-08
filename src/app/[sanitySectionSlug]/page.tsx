import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import queryContentRTF from '@/components/LandingPage/content/content.groq';
import LandingPage from '@/components/LandingPage';

import { generateMetadataFromSanity } from '@/components/LandingPage/metadata';
import { DEFAULT_SECTION } from '@/components/LandingPage/constants';
import { fetchSanityContent } from '@/services/sanity/sanity';
import { getSection } from '@/components/LandingPage/utils';

import type { ContentForRichText } from '@/components/LandingPage/content';

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
  const section = getSection(sanitySection.index);

  // In Sanity, we use only the last word of the actual slug.
  // `/welcome/home` is referenced as `home` in Sanity.
  const slug = section.slug.split('/').pop() || '/';
  const query = queryContentRTF.replaceAll('<SLUG>', slug);
  const content = (await fetchSanityContent(query)) as ContentForRichText;

  return <LandingPage section={sanitySection.index} content={content} />;
}
