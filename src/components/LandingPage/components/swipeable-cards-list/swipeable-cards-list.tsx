import { type CSSProperties, type JSX, useCallback, useEffect, useId, useState } from 'react';

import { classNames } from '@/util/utils';

import { IconChevronLeft } from '../../icons/IconChevronLeft';
import { IconChevronRight } from '../../icons/IconChevronRight';
import { styleButtonSquare } from '../../styles';

import styles from './swipeable-cards-list.module.css';

interface SwipeableCardsListProps {
  className?: string;
  children: JSX.Element[];
  buttonLabel?: string;
  buttonOnClick?(): void;
  hideFooter?: boolean;
  footerOnSmallScreen?: boolean;
  gap?: string;
  style?: CSSProperties;
}

export default function SwipeableCardsList({
  className,
  children,
  buttonLabel,
  buttonOnClick,
  hideFooter = false,
  footerOnSmallScreen = false,
  gap = '48px',
  style = {},
}: SwipeableCardsListProps) {
  const id = useId();
  const makeId = useCallback((index: number) => `${id}_${index}`, [id]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [newsIndex, setNewsIndex] = useState(0);
  const count = children.length;
  const moveTo = useMoveTo(scrollEl, count, makeId);
  useScrollWatcher(scrollEl, count, setNewsIndex, makeId);
  const handleMoveLeft = () => {
    moveTo((newsIndex + count - 1) % count);
  };
  const handleMoveRight = () => {
    moveTo((newsIndex + 1) % count);
  };

  return (
    <div
      className={classNames(className, styles.swipeableCardsList)}
      style={{ ...style, '--custom-gap': gap }}
    >
      <div ref={setScrollEl} className={styles.scroll}>
        {children.map((child, index) => {
          const key = makeId(index);
          return (
            <div key={key} id={key} className={styles.card}>
              {child}
            </div>
          );
        })}
      </div>
      {!hideFooter && (
        <footer className={classNames(footerOnSmallScreen && styles.onlyOnSmallScreen)}>
          <div>
            {buttonLabel && (
              <button type="button" onClick={buttonOnClick} className={styleButtonSquare}>
                {buttonLabel}
              </button>
            )}
          </div>
          <nav>
            <button
              className={styles.arrow}
              type="button"
              onClick={handleMoveLeft}
              aria-label="Previous card"
            >
              <IconChevronLeft />
            </button>
            {children.map((_, index) => (
              <button
                className={classNames(styles.page, index === newsIndex && styles.selected)}
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
        </footer>
      )}
    </div>
  );
}

function useMoveTo(div: HTMLDivElement | null, count: number, makeId: (index: number) => string) {
  return useCallback(
    (index: number) => {
      if (!div || count === 0) return;

      const card = document.getElementById(makeId(index));
      if (!card) return;

      const scrollPosition =
        div.scrollLeft + card.getBoundingClientRect().left - div.getBoundingClientRect().left;

      div.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
    },
    [div, count, makeId]
  );
}

function useScrollWatcher(
  div: HTMLDivElement | null,
  count: number,
  setCardIndex: React.Dispatch<React.SetStateAction<number>>,
  makeId: (index: number) => string
) {
  useEffect(() => {
    if (!div || count === 0) return;

    const handleScroll = () => {
      const xDiv = div.getBoundingClientRect().x;
      for (let index = 0; index < count; index++) {
        const card = document.getElementById(makeId(index));
        if (!card) continue;

        const x = card.getBoundingClientRect().x - xDiv;
        if (x >= 0) {
          setCardIndex(index);
          return;
        }
      }
    };
    div.addEventListener('scroll', handleScroll);
    return () => div.removeEventListener('scroll', handleScroll);
  }, [div, count, setCardIndex, makeId]);
}
