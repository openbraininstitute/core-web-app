import React from 'react';

import { usePainterDendrogram } from './painter/painter';

import { IconStraight } from './icons/straight';
import { IconCircular } from './icons/circular';
import { classNames } from '@/util/utils';
import { Morphology } from '@/services/bluenaas-single-cell/types';

import styles from './viewer-dendrogram.module.css';

export interface ViewerDendrogramProps {
  className?: string;
  morphology: Morphology;
}

export function ViewerDendrogram({ className, morphology }: ViewerDendrogramProps) {
  const { painter, hoveredItem } = usePainterDendrogram(morphology);
  const [mode, setMode] = React.useState<'straight' | 'circular'>('straight');
  React.useEffect(() => {
    painter.mode = mode;
  }, [mode, painter]);
  const toggleMode = () => {
    setMode(mode === 'circular' ? 'straight' : 'circular');
  };

  return (
    <div className={classNames(className, styles.viewerDendrogram)}>
      <canvas ref={painter.init} />
      <button type="button" onClick={toggleMode}>
        {mode === 'circular' ? <IconStraight /> : <IconCircular />}
      </button>
      {hoveredItem && (
        <div className={[styles.hover, styles.top].join(' ')}>
          <div>Section name:</div>
          <div>{hoveredItem.section.name}</div>
        </div>
      )}
    </div>
  );
}
