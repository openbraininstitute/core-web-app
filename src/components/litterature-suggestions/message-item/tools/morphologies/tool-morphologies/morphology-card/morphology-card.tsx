import React from 'react';

import { Morphology } from '../types';
import { FAKE_MORPHOLOGY } from './fake-morphology';
import { classNames } from '@/util/utils';
import { MorphoViewer } from '@/components/MorphoViewer';

import styles from './morphology-card.module.css';

export interface MorphologyCardProps {
  className?: string;
  value: Morphology;
}

export default function MorphologyCard({ className, value }: MorphologyCardProps) {
  // const [swc, setSwc] = React.useState('');
  return (
    <div className={classNames(className, styles.morphologyCard)}>
      <details name="Morphology">
        <summary>
          <strong>{value.name}</strong> {value.description}
          <MorphoViewer className={styles.viewer} swc={FAKE_MORPHOLOGY} />
        </summary>
      </details>
    </div>
  );
}
