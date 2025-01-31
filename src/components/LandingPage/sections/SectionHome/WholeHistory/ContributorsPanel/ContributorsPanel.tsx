import { useState } from 'react';

import ContributorsNavigation from './ContributorsNavigation';
import ContributorsList from './ContributorsList';
import { Contributor } from './data';
import { classNames } from '@/util/utils';

import CenteredColumn from '@/components/LandingPage/CenteredColumn';
import styles from './ContributorsPanel.module.css';

export interface ContributorsPanelProps {
  className?: string;
}

export default function ContributorsPanel({ className }: ContributorsPanelProps) {
  const [contributorsPage, setContributorsPage] = useState<Contributor[]>([]);
  return (
    <div className={classNames(className, styles.contributorsPanel)}>
      <CenteredColumn>
        <ContributorsNavigation onPageChange={setContributorsPage} />
      </CenteredColumn>
      <ContributorsList list={contributorsPage} />
    </div>
  );
}
