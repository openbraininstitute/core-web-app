import React, { useEffect, useRef } from 'react';

import { Contributor } from '../data';
import { classNames } from '@/util/utils';

import CenteredColumn from '@/components/LandingPage/CenteredColumn';
import { styleHoverableButton } from '@/components/LandingPage/styles';
import styles from './ContributorsList.module.css';

export interface ContributorsListProps {
  className?: string;
  list: Contributor[];
}

export default function ContributorsList({ className, list }: ContributorsListProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pagesToDisplay, setPagesToDisplay] = React.useState(1);
  useEffect(() => setPagesToDisplay(1), [list]);
  const [contributorsPerPage, setContributorsPerPage] = React.useState(6);
  useResizeObserver(ref.current, setContributorsPerPage);

  return (
    <>
      <div className={classNames(className, styles.contributorsList)} ref={ref}>
        {list.slice(0, pagesToDisplay * contributorsPerPage).map((contributor) => (
          <div key={contributor.full_name}>
            <div className={styles.name}>{contributor.full_name}</div>
            <div className={styles.links}>
              {contributor.google_scholar && (
                <a
                  className={styleHoverableButton}
                  href={`https://scholar.google.com/citations?user=${contributor.google_scholar}`}
                >
                  Google Scholar
                </a>
              )}
              {contributor.ORCID && (
                <a className={styleHoverableButton} href={`https://orcid.org/${contributor.ORCID}`}>
                  Orcid
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      {pagesToDisplay * contributorsPerPage < list.length && (
        <CenteredColumn>
          <button
            className={classNames(styles.loadMore, styleHoverableButton)}
            type="button"
            onClick={() => setPagesToDisplay(pagesToDisplay + 1)}
          >
            Load more
          </button>
        </CenteredColumn>
      )}
    </>
  );
}

function useResizeObserver(
  div: HTMLDivElement | null,
  setContributorsPerPage: React.Dispatch<React.SetStateAction<number>>
) {
  useEffect(() => {
    if (!div) return;

    const handleResize = () => {
      const contributorEstimatedWidth = 440;
      const contributorsPerRow = Math.max(
        1,
        Math.floor(div.clientWidth / contributorEstimatedWidth)
      );
      const rowsPerPage = 6;
      setContributorsPerPage(contributorsPerRow * rowsPerPage);
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(div);
    handleResize();
    return () => observer.unobserve(div);
  }, [div, setContributorsPerPage]);
}
