import { notFound } from 'next/navigation';

import LandingPage from '@/components/LandingPage';
import { DEFAULT_SECTION } from '@/components/LandingPage/constants';
import { getSection } from '@/components/LandingPage/utils';

// TODO: Add page metadata

export default function SanityContentPage({ params }: { params: { sanitySectionSlug: string } }) {
  const sanitySection = getSection(params.sanitySectionSlug);

  if (sanitySection.slug === DEFAULT_SECTION.slug) {
    notFound();
  }

  return <LandingPage section={sanitySection.index} />;
}
