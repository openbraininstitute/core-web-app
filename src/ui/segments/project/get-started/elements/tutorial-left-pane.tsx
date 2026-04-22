'use client';

import { useAtom } from 'jotai';
import { useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import GlossarySection from '@/ui/segments/help/glossary';
import { AboutView } from '@/ui/segments/project/get-started/elements/about-view';
import { DataPreview } from '@/ui/segments/project/get-started/elements/data-preview';
import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';
import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';

import type { ReactNode } from 'react';
import type { AboutContentProps } from '@/services/sanity/api/get-about-content';

export function TutorialLeftPane({
  children,
  aboutContent,
}: {
  children: ReactNode;
  aboutContent: AboutContentProps;
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

  if (view === 'about') return <AboutView content={aboutContent} />;
  if (view === 'glossary') return <GlossarySection />;
  if (preview) return <DataPreview />;
  return <>{children}</>;
}

export default TutorialLeftPane;
