'use client';

import { useMemo, useState } from 'react';

import ContributorsList from './contributors-list';
import ContributorsNavigation from './contributors-navigation';
import { splitByCapitalLetterOfLastName, useContributors } from './data';

export function WidgetContributorsPanel() {
  const contributors = useContributors();
  const pages = useMemo(() => splitByCapitalLetterOfLastName(contributors), [contributors]);
  const [page, setPage] = useState(0);
  const currentPage = pages[page] ?? [];
  return (
    <>
      <ContributorsNavigation pages={pages} page={page} onPageChange={setPage} />
      <ContributorsList list={currentPage} />
    </>
  );
}
