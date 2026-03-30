'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSanityContentForPage } from '@/components/LandingPage/content/content';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { cn } from '@/utils/css-class';

import FeatureBlock from './feature-block';

import type { ContentForSingleFeature } from '@/components/LandingPage/content/types';
import type { ContentForFeatures, FeatureInViewOptions } from './feature-block';

/** Mobile: active section updates when it intersects the middle 60% of the viewport (20% inset top & bottom). */
const MOBILE_IN_VIEW_OPTIONS: FeatureInViewOptions = {
  margin: '-20% 0px -20% 0px',
  amount: 'some',
};

const DESKTOP_IN_VIEW_OPTIONS: FeatureInViewOptions = { amount: 0.5 };

function toContentForFeatures(source: {
  titleH1?: unknown;
  titleH2?: unknown;
  headline?: unknown;
  headLine?: unknown;
  description?: unknown;
  useCases?: unknown;
  data?: unknown;
  backgroundColor?: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}): ContentForFeatures {
  const useCases = Array.isArray(source.useCases)
    ? source.useCases.map((u) =>
        typeof u === 'string'
          ? u
          : typeof u === 'object' && u && 'title' in u
            ? String((u as { title: string }).title)
            : String(u)
      )
    : [];

  const data = Array.isArray(source.data)
    ? source.data.map((d) => {
        const item = d as Record<string, unknown>;
        return {
          label: String(item.label ?? item.name ?? ''),
          value: (item.value ?? '') as string | number,
        };
      })
    : undefined;

  return {
    titleH1: typeof source.titleH1 === 'string' ? source.titleH1 : undefined,
    titleH2: typeof source.titleH2 === 'string' ? source.titleH2 : undefined,
    headline:
      typeof source.headline === 'string'
        ? source.headline
        : typeof source.headLine === 'string'
          ? source.headLine
          : undefined,
    description: typeof source.description === 'string' ? source.description : undefined,
    useCases,
    data,
    backgroundColor:
      typeof source.backgroundColor === 'string' ? source.backgroundColor : undefined,
    backgroundImage:
      typeof source.backgroundImage === 'string' ? source.backgroundImage : undefined,
    theme: typeof source.theme === 'string' ? source.theme : undefined,
  };
}

function isSingleFeature(item: unknown): item is ContentForSingleFeature {
  return (
    typeof item === 'object' &&
    item !== null &&
    '_type' in item &&
    (item as { _type: string })._type === 'singleFeature'
  );
}

export default function SectionFeatures() {
  const pageContent = useSanityContentForPage(EnumSection.Features);
  const [activeSection, setActiveSection] = useState(0);
  const [inViewOptions, setInViewOptions] = useState<FeatureInViewOptions>(DESKTOP_IN_VIEW_OPTIONS);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      setInViewOptions(mq.matches ? MOBILE_IN_VIEW_OPTIONS : DESKTOP_IN_VIEW_OPTIONS);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const handleInView = useCallback((index: number) => setActiveSection(index), []);

  const featureBlocks: ContentForFeatures[] = [];
  if (pageContent?.content && Array.isArray(pageContent.content)) {
    const singleFeatures = pageContent.content.filter(isSingleFeature);
    if (singleFeatures.length > 0) {
      featureBlocks.push(...singleFeatures.map(toContentForFeatures));
    }
  }
  if (featureBlocks.length === 0 && pageContent) {
    const fromPage = toContentForFeatures(pageContent);
    if (fromPage.titleH1 || fromPage.titleH2 || fromPage.headline || fromPage.useCases.length > 0) {
      featureBlocks.push(fromPage);
    }
  }

  if (featureBlocks.length === 0) {
    return (
      <div className="relative w-full px-4 sm:px-8 lg:px-32 py-16">
        <p className="text-gray-500">No features content available.</p>
      </div>
    );
  }

  const scrollToBlock = (index: number) => {
    setActiveSection(index);
    const element = document.getElementById(`feature-block-${index}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeBlock = featureBlocks[activeSection];
  const isActiveThemeDark = activeBlock?.theme === 'dark';
  const activeDotClass = isActiveThemeDark ? 'bg-white' : 'bg-primary-9';
  const inactiveDotClass = isActiveThemeDark ? 'bg-primary-6' : 'bg-neutral-3';

  return (
    <>
      <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4">
        {featureBlocks.map((block, index) => (
          <button
            key={block.titleH1 ?? block.titleH2 ?? `section-${index}`}
            type="button"
            onClick={() => scrollToBlock(index)}
            className="w-4 h-4 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
            aria-label={`Scroll to section ${index + 1}`}
          >
            <span
              className={cn(
                'w-2 h-4 rounded-lg',
                index === activeSection ? activeDotClass : inactiveDotClass
              )}
            />
          </button>
        ))}
      </nav>
      <div className="relative w-full">
        {featureBlocks.map((block, index) => (
          <FeatureBlock
            key={block.titleH1 ?? block.titleH2 ?? index}
            id={index}
            content={block}
            inViewOptions={inViewOptions}
            onInView={handleInView}
          />
        ))}
      </div>
    </>
  );
}
