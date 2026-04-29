'use client';

import { useState } from 'react';

import ContributorsList from './contributors-list';
import ContributorsNavigation from './contributors-navigation';

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
