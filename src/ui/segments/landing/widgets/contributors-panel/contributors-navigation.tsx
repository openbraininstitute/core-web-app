'use client';

/* eslint-disable react/no-array-index-key */
import { type CSSProperties, useRef } from 'react';

import { IconChevronLeft } from '@/ui/segments/landing/icons/icon-chevron-left';
import { IconChevronRight } from '@/ui/segments/landing/icons/icon-chevron-right';
import { styleBlockSmall, styleButtonHoverable } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import styles from './contributors-navigation.module.css';

import type { Contributor } from './data';

interface ContributorsNavigationProps {
  pages: Contributor[][];
  page: number;
  onPageChange(page: number): void;
}

const LETTER_WIDTH = 32;
const LETTER_MARGIN = 12;

export default function ContributorsNavigation({
  pages,
  page,
  onPageChange,
}: ContributorsNavigationProps) {
  const refLetters = useRef<HTMLDivElement | null>(null);
  const handleScrollRight = () => handleScroll(refLetters.current, +1);
  const handleScrollLeft = () => handleScroll(refLetters.current, -1);

  return (
    <div
      className={classNames(styles.contributorsPanel, styleBlockSmall)}
      style={{
        '--custom-width-letter': `${LETTER_WIDTH}px`,
        '--custom-margin-letter': `${LETTER_MARGIN}px`,
      }}
    >
      <div className={styles.pages}>
        <button
          type="button"
          className={styles.chevron}
          onClick={handleScrollLeft}
          aria-label="Previous page"
        >
          <IconChevronLeft />
        </button>
        <div className={styles.container}>
          <div className={styles.letters} ref={refLetters}>
            {pages.map((group, i) => {
              const style: CSSProperties = {};
              if (i % 5 === 0) {
                style.scrollSnapStop = 'always';
              }
              return (
                <div className={styles.letter} key={`page-${i}`} style={style}>
                  <button
                    className={styleButtonHoverable}
                    type="button"
                    disabled={page === i}
                    onClick={() => onPageChange(i)}
                  >
                    {group[0].last_name.trim().charAt(0).toUpperCase()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          className={styles.chevron}
          onClick={handleScrollRight}
          aria-label="Next page"
        >
          <IconChevronRight />
        </button>
      </div>
    </div>
  );
}

function handleScroll(div: HTMLDivElement | null, direction: number) {
  if (!div) return;

  const letterWidth = 5 * (LETTER_WIDTH + 2 * LETTER_MARGIN);
  const lettersPerPage = Math.floor(div.clientWidth / letterWidth);
  const pageWidth = letterWidth * lettersPerPage;
  const x = div.scrollLeft + direction * pageWidth;
  div.scrollTo({
    left: x,
    behavior: 'smooth',
  });
}
