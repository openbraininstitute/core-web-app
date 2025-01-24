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
        <div>Download our</div>
        <h2>Mission statement</h2>
        <div>
          Download the PDF to explore how we’re advancing neuroscience through innovation,
          collaboration, and open science.
        </div>
      </div>
      <div className={styles.image}>
        <IconDownloadFile />
      </div>
    </button>
  );
}
