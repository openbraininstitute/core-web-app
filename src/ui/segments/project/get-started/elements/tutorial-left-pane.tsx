'use client';

import { useAtom } from 'jotai';
import { useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import FeaturesSection from '@/ui/segments/help/features';
import GlossarySection from '@/ui/segments/help/glossary';
import { AboutView } from '@/ui/segments/project/get-started/elements/about-view';
import { DataPreview } from '@/ui/segments/project/get-started/elements/data-preview';
import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';
import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';
import { NewsView } from '@/ui/segments/project/get-started/elements/news-view';
import { PricingView } from '@/ui/segments/project/get-started/elements/pricing-view';

import type { PortableTextBlock } from 'next-sanity';
import type { ReactNode } from 'react';
import type { AboutContentProps } from '@/services/sanity/api/get-about-content';
import type { GuidesContentsProps } from '@/services/sanity/api/get-guides-content';

export function TutorialLeftPane({
  children,
  aboutContent,
}: {
  children: ReactNode;
  aboutContent: AboutContentProps;
  guidesContent: GuidesContentsProps;
}) {
  const [preview, setPreview] = useAtom(dataPreviewAtom);
  const [view, setView] = useAtom(leftPaneViewAtom);
  const { slug } = useParams<{ slug: string }>();
  const lastSlugRef = useRef(slug);

  useEffect(() => {
    if (slug !== lastSlugRef.current) {
      lastSlugRef.current = slug;
      setPreview(null);
      setView(null);
    }
  }, [slug, setPreview, setView]);

  if (view === 'about')
    return <AboutView blocks={aboutContent.aboutContent as PortableTextBlock[] | undefined} />;
  if (view === 'terms')
    return (
      <AboutView
        blocks={aboutContent.termsAndConditionContent as PortableTextBlock[] | undefined}
      />
    );
  if (view === 'glossary') return <GlossarySection />;
  if (view === 'features') return <FeaturesSection />;
  if (view === 'pricing') return <PricingView />;
  if (view === 'news') return <NewsView />;
  if (preview) return <DataPreview />;
  return <>{children}</>;
}

export default TutorialLeftPane;
