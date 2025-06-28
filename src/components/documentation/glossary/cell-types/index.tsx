'use client';

import debounce from 'lodash/debounce';
import { Metadata } from 'next';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import AllTypesBlock from './all-types-block';

export const metadata: Metadata = {
  title: 'Glossary cell types definitions',
  description: 'Explore the glossary cell types definitions in our documentation.',
};

export default function CellTypeDefinitionsFullList() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [highlightedCellType, setHighlightedCellType] = useState<string | null>(null);
  const [lastVisibleSection, setLastVisibleSection] = useState<string | null>(null);

  const cellTypeParam = searchParams.get('cell-type');

  useEffect(() => {
    if (cellTypeParam) {
      const element = document.getElementById(cellTypeParam);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightedCellType(cellTypeParam);
      }
    }
  }, [cellTypeParam]);

  const debouncedHandleSectionInView = useRef(
    debounce(
      (
        sectionSlug: string,
        currentLastVisibleSection: string | null,
        currentSearchParams: URLSearchParams,
        currentRouter: any,
        currentPathname: string
      ) => {
        if (
          sectionSlug !== currentLastVisibleSection &&
          sectionSlug !== currentSearchParams.get('cell-type')
        ) {
          setLastVisibleSection(sectionSlug);
          const params = new URLSearchParams(currentSearchParams);
          params.set('cell-type', sectionSlug);
          currentRouter.push(`${currentPathname}?${params.toString()}`, { scroll: false });
        }
      },
      100
    )
  ).current;

  useEffect(() => {
    return () => {
      debouncedHandleSectionInView.cancel();
    };
  }, [debouncedHandleSectionInView]);

  const handleSectionInView = useCallback(
    (sectionSlug: string) => {
      debouncedHandleSectionInView(sectionSlug, lastVisibleSection, searchParams, router, pathname);
    },
    [lastVisibleSection, searchParams, router, pathname, debouncedHandleSectionInView]
  );

  return (
    <div className="relative flex w-full flex-col gap-4 text-white">
      <AllTypesBlock
        cellType={slug as 'm-type' | 'e-type'}
        highlightedCellType={highlightedCellType}
        setHighlightedCellType={setHighlightedCellType}
        onSectionInView={handleSectionInView}
      />
    </div>
  );
}
