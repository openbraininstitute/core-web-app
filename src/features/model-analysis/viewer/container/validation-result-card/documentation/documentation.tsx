import React from 'react';

import { FlatValidationResult } from '../../hooks';

import { classNames } from '@/util/utils';

import styles from './documentation.module.css';

export interface DocumentationProps {
  className?: string;
  value: FlatValidationResult;
}

export default function Documentation({ className, value }: DocumentationProps) {
  const { documentation } = value;

  if (!documentation) return null;

  const { protocol } = documentation;
  return (
    <div className={classNames(className, styles.documentation)}>
      {value.extraVariables && (
        <>
          <ul>
            {Object.keys(value.extraVariables).map((key) => (
              <li key={key}>
                <span>{key}: </span>
                <strong>{value.extraVariables?.[key].value}</strong>{' '}
                <span>{value.extraVariables?.[key].unit}</span>
              </li>
            ))}
          </ul>
          <hr />
        </>
      )}
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
