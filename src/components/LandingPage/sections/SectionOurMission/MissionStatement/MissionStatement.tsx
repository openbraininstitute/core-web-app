import React from 'react';

import StatementURL from './mission-statement.pdf';
import { classNames } from '@/util/utils';

import { IconDownloadFile } from '@/components/LandingPage/icons/IconDownloadFile';
import styles from './MissionStatement.module.css';

export interface MissionStatementProps {
  className?: string;
}

export default function MissionStatement({ className }: MissionStatementProps) {
  const handleDownload = () => {
    window.open(StatementURL);
  };
  return (
    <button
      type="button"
      className={classNames(className, styles.missionStatement)}
      onClick={handleDownload}
    >
      <div className={styles.text}>
        <h2>Download our mission</h2>
        <div>
          Through this integrated approach to digital brain modeling and collaborative virtual
          laboratories, the Open Brain Institute aims to accelerate scientific discovery,
          democratize access to advanced research tools
        </div>
      </div>
      <div className={styles.image}>
        <IconDownloadFile />
      </div>
    </button>
  );
}
