import { useState } from 'react';
import ContributorsList from './ContributorsList';
import ContributorsNavigation from './ContributorsNavigation';
import type { Contributor } from './data';

export function WidgetContributorsPanel() {
  const [contributorsPage, setContributorsPage] = useState<Contributor[]>([]);
  return (
    <>
      <ContributorsNavigation onPageChange={setContributorsPage} />
      <ContributorsList list={contributorsPage} />
    </>
  );
}
