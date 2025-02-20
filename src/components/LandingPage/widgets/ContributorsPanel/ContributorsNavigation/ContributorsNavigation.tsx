/* eslint-disable react/no-array-index-key */
import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

import { PortableText } from 'next-sanity';
import { Contributor, useContributors } from '../data';
import { IconChevronLeft } from '@/components/LandingPage/icons/IconChevronLeft';
import { IconChevronRight } from '@/components/LandingPage/icons/IconChevronRight';

import { styleBlockSmall, styleButtonHoverable } from '@/components/LandingPage/styles';
import { useSanityContentForContributors } from '@/components/LandingPage/content/contributors';
import { classNames } from '@/util/utils';
import styles from './ContributorsNavigation.module.css';

export interface ContributorsNavigationProps {
  onPageChange(contributors: Contributor[]): void;
}

const LETTER_WIDTH = 32;
const LETTER_MARGIN = 12;

export default function ContributorsNavigation({ onPageChange }: ContributorsNavigationProps) {
  const { title, description } = useSanityContentForContributors();
  const refLetters = useRef<HTMLDivElement | null>(null);
  const contributors = useContributors();
  const pages = useMemo(() => splitByCapitalLetterOfLastName(contributors), [contributors]);
  const [page, setPage] = useState(0);
  useEffect(() => {
    onPageChange(pages[page] ?? []);
  }, [page, pages, onPageChange]);
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
      <header>
        <div className={styles.thanks}>{title}</div>
        <div className={styles.more}>
          <PortableText value={description} />
        </div>
      </header>
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
                    onClick={() => setPage(i)}
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

function splitByCapitalLetterOfLastName(contributors: Contributor[]): Contributor[][] {
  const mapByCapital = new Map<string, Contributor[]>();
  for (const contrib of contributors) {
    const cap = contrib.last_name.trim().charAt(0).toUpperCase();
    const group = mapByCapital.get(cap);
    if (group) {
      group.push(contrib);
    } else {
      mapByCapital.set(cap, [contrib]);
    }
  }
  const groups: Contributor[][] = Array.from(mapByCapital.values());
  return groups.sort((g1: Contributor[], g2: Contributor[]) => {
    const n1 = g1[0].last_name.trim().charAt(0).toUpperCase();
    const n2 = g2[0].last_name.trim().charAt(0).toUpperCase();
    if (n1 < n2) return -1;
    if (n1 > n2) return +1;
    return 0;
  });
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
