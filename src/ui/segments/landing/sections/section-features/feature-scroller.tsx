'use client';

import { useCallback, useEffect, useState } from 'react';

import { classNames } from '@/util/utils';

import FeatureBlock, { type FeatureInViewOptions } from './feature-block';

import type { ContentForFeatures } from '@/services/sanity/api/get-features-content';

const MOBILE_IN_VIEW_OPTIONS: FeatureInViewOptions = {
  margin: '-20% 0px -20% 0px',
  amount: 'some',
};

const DESKTOP_IN_VIEW_OPTIONS: FeatureInViewOptions = { amount: 0.5 };

interface FeatureScrollerProps {
  blocks: ContentForFeatures[];
}

export default function FeatureScroller({ blocks }: FeatureScrollerProps) {
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

  const scrollToBlock = (index: number) => {
    setActiveSection(index);
    document.getElementById(`feature-block-${index}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const activeBlock = blocks[activeSection];
  const isActiveThemeDark = activeBlock?.theme === 'dark';
  const activeDotClass = isActiveThemeDark ? 'bg-white' : 'bg-primary-9';
  const inactiveDotClass = isActiveThemeDark ? 'bg-primary-6' : 'bg-neutral-3';

  return (
    <>
      <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4">
        {blocks.map((block, index) => (
          <button
            key={block.titleH1 ?? block.titleH2 ?? `section-${index}`}
            type="button"
            onClick={() => scrollToBlock(index)}
            className="w-4 h-4 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
            aria-label={`Scroll to section ${index + 1}`}
          >
            <span
              className={classNames(
                'w-2 h-4 rounded-lg',
                index === activeSection ? activeDotClass : inactiveDotClass
              )}
            />
          </button>
        ))}
      </nav>
      <div className="relative w-screen">
        {blocks.map((block, index) => (
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
