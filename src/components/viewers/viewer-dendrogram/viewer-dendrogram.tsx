import React from 'react';

import { usePainterDendrogram } from './painter/painter';

import { classNames } from '@/util/utils';
import { Morphology } from '@/services/bluenaas-single-cell/types';

import styles from './viewer-dendrogram.module.css';

export interface ViewerDendrogramProps {
  className?: string;
  morphology: Morphology;
}

export function ViewerDendrogram({ className, morphology }: ViewerDendrogramProps) {
  const painter = usePainterDendrogram(morphology);

  return (
    <div className={classNames(className, styles.viewerDendrogram)}>
      <canvas ref={painter.init} />
    </div>
  );
}
