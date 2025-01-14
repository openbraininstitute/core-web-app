/* eslint-disable react/no-array-index-key */
import React, { useEffect, useMemo, useState } from 'react';

import { Contributor, useContributors } from '../data';
import { classNames } from '@/util/utils';
import { IconChevronLeft } from '@/components/LandingPage/icons/IconChevronLeft';
import { IconChevronRight } from '@/components/LandingPage/icons/IconChevronRight';

import styles from './ContributorsNavigation.module.css';

export interface ContributorsNavigationProps {
  className?: string;
  onPageChange(contributors: Contributor[]): void;
}

export default function ContributorsNavigation({
  className,
  onPageChange,
}: ContributorsNavigationProps) {
  const contributors = useContributors();
  const pages = useMemo(() => splitByCapitalLetterOfLastName(contributors), [contributors]);
  const [page, setPage] = useState(0);
  useEffect(() => {
    onPageChange(pages[page] ?? []);
  }, [page, pages, onPageChange]);

  return (
    <div className={classNames(className, styles.contributorsNavigation)}>
      <div className={styles.thanks}>
        We thank the {humanFriendlyCount(contributors)}
        <br />
        contributors
      </div>
      <div className={styles.more}>
        who advanced the Blue Brain Project scientifically over the years. We couldn&apos;t have
        done this without you!
      </div>
      <div className={styles.pages}>
        <button
          type="button"
          className={styles.chevron}
          disabled={page < 1}
          onClick={() => setPage(page - 1)}
          aria-label="Pevious page"
        >
          <IconChevronLeft />
        </button>
        <div>
          {pages.map((group, i) => (
            <button
              type="button"
              key={`page-${i}`}
              disabled={page === i}
              onClick={() => setPage(i)}
            >
              {group[0].last_name.trim().charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.chevron}
          disabled={page >= pages.length - 1}
          onClick={() => setPage(page + 1)}
          aria-label="Next page"
        >
          <IconChevronRight />
        </button>
      </div>
    </div>
  );
}

function humanFriendlyCount(list: Array<any>): React.ReactNode {
  const num = Math.floor(list.length / 100) * 100;
  const txt = new Intl.NumberFormat().format(num);
  return `${txt}+`;
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
