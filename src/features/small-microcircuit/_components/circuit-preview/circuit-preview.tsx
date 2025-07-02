/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { useCircuitImageURL } from '../hooks/circuit';
import { classNames } from '@/util/utils';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';

import styles from './circuit-preview.module.css';

export interface CircuitPreviewProps {
  className?: string;
  circuit: ICircuit | undefined | null;
}

export default function CircuitPreview({ className, circuit }: CircuitPreviewProps) {
  const url = useCircuitImageURL(circuit?.id);

  return (
    <div className={classNames(className, styles.circuitPreview, url && styles.show)}>
      <img alt="Circuit preview" src={url} className="w-full rounded-xl border border-gray-200" />
    </div>
  );
}
