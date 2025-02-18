/* eslint-disable react/no-array-index-key */
/* eslint-disable no-param-reassign */
import React from 'react';

import { IconChevronLeft } from '../../icons/IconChevronLeft';
import { IconChevronRight } from '../../icons/IconChevronRight';
import { styleButtonSquare } from '../../styles';
import { classNames } from '@/util/utils';

import styles from './swipeable-cards-list.module.css';

export interface SwipeableCardsListProps {
  className?: string;
  children: JSX.Element[];
  buttonLabel?: string;
  buttonOnClick?(): void;
  hideFooter?: boolean;
  gap?: string;
}

export default function SwipeableCardsList({
  className,
  children,
  buttonLabel,
  buttonOnClick,
  hideFooter = false,
  gap = '48px',
}: SwipeableCardsListProps) {
  const id = React.useId();
  const makeId = (index: number) => `${id}_${index}`;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [newsIndex, setNewsIndex] = React.useState(0);
  const count = children.length;
  const moveTo = useMoveTo(ref.current, count, makeId);
  useScrollWatcher(ref.current, count, setNewsIndex, makeId);
  const handleMoveLeft = () => {
    moveTo((newsIndex + count - 1) % count);
  };
  const handleMoveRight = () => {
    moveTo((newsIndex + 1) % count);
  };

  return (
    <div
      className={classNames(className, styles.swipeableCardsList)}
      style={{ '--custom-gap': gap }}
    >
      <div ref={ref} className={styles.scroll}>
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
        <footer>
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
  return React.useCallback(
    (index: number) => {
      if (!div || count === 0) return;

      const xDiv = div.getBoundingClientRect().x - div.scrollLeft;
      const card = document.getElementById(makeId(index));
      if (!card) return;

      const xCard = card.getBoundingClientRect().x;
      const scroll = xCard - xDiv;
      div.scrollLeft = scroll;
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
  React.useEffect(() => {
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
