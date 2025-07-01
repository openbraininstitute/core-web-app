/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { useCircuitImageURL } from '../hooks/circuit';
import { classNames } from '@/util/utils';

import styles from './circuit-preview.module.css';

export interface CircuitPreviewProps {
  className?: string;
  circuitId: string;
}

export default function CircuitPreview({ className, circuitId }: CircuitPreviewProps) {
  const url = useCircuitImageURL(circuitId);

  return (
    <div className={classNames(className, styles.circuitPreview, url && styles.show)}>
      <img alt="Circuit preview" src={url} className="w-full rounded-xl border border-gray-200" />
    </div>
  );
}
