import React from 'react';

import { getDocumentation } from './dictionary';

import { classNames } from '@/util/utils';

import styles from './documentation.module.css';

export interface DocumentationProps {
  className?: string;
  assetPath: string;
}

export default function Documentation({ className, assetPath }: DocumentationProps) {
  const documentation = getDocumentation(assetPath);

  if (!documentation) return null;

  const { protocol } = documentation;
  return (
    <div className={classNames(className, styles.documentation)}>
      <p>{documentation.description}</p>
      <div className={styles.grid}>
        <div>Type:</div>
        <div>{protocol.type}</div>
        <div>Delay:</div>
        <div>{protocol.delay}</div>
        <div>Duration:</div>
        <div>{protocol.duration}</div>
        <div>Amplitude:</div>
        <div>{protocol.amplitude}</div>
        <div>Total duration:</div>
        <div>{protocol.totalDuration}</div>
      </div>
      <p>
        <b>Validation condition: </b>
        {documentation.validation_condition}
      </p>
    </div>
  );
}
