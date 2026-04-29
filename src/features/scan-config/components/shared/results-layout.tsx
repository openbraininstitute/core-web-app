import type { ReactNode } from 'react';

import styles from '@/features/scan-config/scan-config.module.css';

type Props = {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
  campaignId?: string;
};

export function ResultsLayout({ left, middle, right, campaignId }: Props) {
  const idBase = campaignId ? `scan-config-results-${campaignId}` : 'scan-config-results';
  const leftId = `${idBase}-left-column`;
  const middleId = `${idBase}-middle-column`;
  const rightId = `${idBase}-right-column`;

  return (
    <div className={styles.threeColumns}>
      <div id={leftId} className="border-r border-gray-200 pr-4">
        {left}
      </div>
      <div id={middleId} className="relative border-r border-gray-200 px-4">
        {middle}
      </div>
      <div id={rightId} className="relative pl-4">
        {right}
      </div>
    </div>
  );
}
