'use client';

import { useAtom } from 'jotai';
import { useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { DataPreview } from '@/ui/segments/project/get-started/elements/data-preview';
import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';

import type { ReactNode } from 'react';

export function TutorialLeftPane({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useAtom(dataPreviewAtom);
  const { slug } = useParams<{ slug: string }>();
  const lastSlugRef = useRef(slug);

  useEffect(() => {
    if (slug !== lastSlugRef.current) {
      lastSlugRef.current = slug;
      setPreview(null);
    }
  }, [slug, setPreview]);

  if (preview) return <DataPreview />;
  return <>{children}</>;
}

export default TutorialLeftPane;
