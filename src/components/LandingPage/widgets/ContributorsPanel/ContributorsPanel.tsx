import { useState } from 'react';

import ContributorsNavigation from './ContributorsNavigation';
import ContributorsList from './ContributorsList';
import { Contributor } from './data';

export interface WidgetContributorsPanelProps {
  className?: string;
}

export function WidgetContributorsPanel() {
  const [contributorsPage, setContributorsPage] = useState<Contributor[]>([]);
  return (
    <>
      <ContributorsNavigation onPageChange={setContributorsPage} />
      <ContributorsList list={contributorsPage} />
    </>
  );
}
