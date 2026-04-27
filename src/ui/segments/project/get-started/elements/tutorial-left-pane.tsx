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
import { PublicationsView } from '@/ui/segments/project/get-started/elements/publications-view';
import { TermsView } from '@/ui/segments/project/get-started/elements/terms-view';

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

  const helpHidden = view === null;

  return (
    <>
      <div className={view !== null || preview ? 'hidden' : 'h-full'}>{children}</div>
      {helpHidden && preview && <DataPreview />}
      {view === 'about' && (
        <AboutView blocks={aboutContent.aboutContent as PortableTextBlock[] | undefined} />
      )}
      {view === 'terms' && <TermsView />}
      {view === 'glossary' && <GlossarySection />}
      {view === 'features' && <FeaturesSection />}
      {view === 'pricing' && <PricingView />}
      {view === 'news' && <NewsView />}
      {view === 'publications' && <PublicationsView />}
    </>
  );
}

export default TutorialLeftPane;
