'use client';

import React from 'react';

import SingleTutorialCard from '../documentation/main/single-tutorial-card';
import { TutorialProps } from '../documentation/type';
import { useSanityContentForTutorialsList } from './hooks';
import { Navigation } from './navigation';
import { scrollCardIntoView } from './scroll';

import { classNames } from '@/util/utils';

import styles from './tutorials-carrousel.module.css';

export interface TutorialsCarrouselProps {
  className?: string;
}

export function TutorialsCarrousel({ className }: TutorialsCarrouselProps) {
  const refContainer = React.useRef<HTMLDivElement | null>(null);
  const [showNavigation, setShowNavigation] = React.useState(false);
  const [cardIndex, setCardIndex] = React.useState(0);

  const tutorials = useSanityContentForTutorialsList();
  const content =
    tutorials && !Array.isArray(tutorials) && 'tutorialOrder' in tutorials
      ? tutorials.tutorialOrder
      : [];

  React.useEffect(() => {
    const container = refContainer.current;
    if (!container) return;

    const handleResize = () => {
      setShowNavigation(container.scrollWidth > container.clientWidth);
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    handleResize();
    return () => observer.unobserve(container);
  });

  const handleScrollCardIntoView = (index: number) => {
    const container = refContainer.current;
    if (!container) return;

    scrollCardIntoView(container, index);
    setCardIndex(index);
  };

  return (
    <div className={classNames(className, styles.tutorialsCarrousel, 'w-full max-w-7xl')}>
      <header>
        <h1>Our tutorials</h1>
        {showNavigation && (
          <Navigation
            count={content.length}
            value={cardIndex}
            onChange={handleScrollCardIntoView}
          />
        )}
      </header>
      <div ref={refContainer}>
        {content.map((value: TutorialProps) => (
          <SingleTutorialCard key={value.url} content={value} />
        ))}
      </div>
    </div>
  );
}
