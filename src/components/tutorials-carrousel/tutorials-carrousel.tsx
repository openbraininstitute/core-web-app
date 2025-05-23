import React from 'react';

import { useSanityContentForTutorialsList } from './hooks';
import { TutorialCard } from './tutorial-card';
import { scrollCardIntoView } from './scroll';
import { Navigation } from './navigation';
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
    <div className={classNames(className, styles.tutorialsCarrousel)}>
      <header>
        <h1>Our tutorials</h1>
        {showNavigation && (
          <Navigation
            count={tutorials.length}
            value={cardIndex}
            onChange={handleScrollCardIntoView}
          />
        )}
      </header>
      <div ref={refContainer}>
        {tutorials.map((value) => (
          <TutorialCard key={value.url} value={value} />
        ))}
      </div>
    </div>
  );
}
