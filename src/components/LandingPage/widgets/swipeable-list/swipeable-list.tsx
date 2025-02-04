/* eslint-disable no-param-reassign */
/* eslint-disable react/no-array-index-key */
import React from 'react';

import Title from '../../components/Title/Title';
import { styleBlockSmall, styleButtonSquare } from '../../styles';
import { gotoSection } from '../../utils';
import NewsCard from './card';
import { ContentForSwipeableListItem, useSanityContentForSwipeableList } from './hooks';
import { classNames } from '@/util/utils';
import { IconChevronLeft } from '@/components/LandingPage/icons/IconChevronLeft';
import { IconChevronRight } from '@/components/LandingPage/icons/IconChevronRight';

import styles from './swipeable-list.module.css';

export interface WidgetNewsProps {
  className?: string;
}

export function WidgetSwipeableList({ className }: WidgetNewsProps) {
  const swipeableList = useSanityContentForSwipeableList();
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [cardIndex, setCardIndex] = React.useState(0);
  const moveTo = useMoveTo(ref.current, swipeableList?.list ?? []);
  useScrollWatcher(ref.current, swipeableList?.list ?? [], setCardIndex);

  if (!swipeableList) return null;

  const { title, button, link, list } = swipeableList;
  const handleButtonClick = () => gotoSection(link);
  const handleMoveLeft = () => {
    moveTo((cardIndex + list.length - 1) % list.length);
  };
  const handleMoveRight = () => {
    moveTo((cardIndex + 1) % list.length);
  };

  if (list.length === 0) return null;

  return (
    <>
      <Title value={title} />
      <main ref={ref} className={classNames(className, styles.swipeableCard, styleBlockSmall)}>
        {list.map((item, index) => (
          <NewsCard key={index} value={item} />
        ))}
      </main>
      <footer className={classNames(styleBlockSmall, styles.swipeableCard)}>
        <button type="button" className={classNames(styleButtonSquare)} onClick={handleButtonClick}>
          {button}
        </button>
        {list.length > 1 && (
          <nav>
            <button
              className={styles.arrow}
              type="button"
              onClick={handleMoveLeft}
              aria-label="Previous card"
            >
              <IconChevronLeft />
            </button>
            {list.map((_, index) => (
              <button
                className={classNames(styles.page, index === cardIndex && styles.selected)}
                key={index}
                onClick={() => moveTo(index)}
                type="button"
                aria-label={`Go to card #${index + 1}`}
              />
            ))}
            <button
              className={styles.arrow}
              type="button"
              onClick={handleMoveRight}
              aria-label="Next card"
            >
              <IconChevronRight />
            </button>
          </nav>
        )}
      </footer>
    </>
  );
}

function useMoveTo(div: HTMLDivElement | null, cards: ContentForSwipeableListItem[]) {
  return React.useCallback(
    (index: number) => {
      if (!div || cards.length === 0) return;

      const scroll = (index * div.scrollWidth) / cards.length;
      div.scrollLeft = scroll;
    },
    [div, cards]
  );
}

function useScrollWatcher(
  div: HTMLDivElement | null,
  cards: ContentForSwipeableListItem[],
  setNewsIndex: React.Dispatch<React.SetStateAction<number>>
) {
  React.useEffect(() => {
    if (!div || cards.length === 0) return;

    const handleScroll = () => {
      const section = div.scrollWidth / cards.length;
      const newsIndex = Math.floor(div.scrollLeft / section);
      setNewsIndex(newsIndex);
    };
    div.addEventListener('scroll', handleScroll);
    return () => div.removeEventListener('scroll', handleScroll);
  }, [div, cards, setNewsIndex]);
}
