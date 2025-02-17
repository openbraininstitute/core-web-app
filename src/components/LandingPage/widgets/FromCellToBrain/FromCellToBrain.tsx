import React from 'react';

import { styleBlockLarge } from '../../styles';
import ProgressiveImage from '../../components/ProgressiveImage';
import { useSanityContentForFromCelltoBrainContent } from './hooks';
import { classNames } from '@/util/utils';

import styles from './FromCellToBrain.module.css';

export interface WidgetFromCellToBrainProps {
  className?: string;
}

export function WidgetFromCellToBrain({ className }: WidgetFromCellToBrainProps) {
  const columns = useSanityContentForFromCelltoBrainContent();

  return (
    <div className={classNames(className, styles.widgetFromCellToBrain, styleBlockLarge)}>
      {columns.map((col) => (
        <div key={col.title} className={styles.column}>
          <h2>{col.title}</h2>
          {col.cards.map((card) => (
            <div key={card.title} className={styles.card}>
              <h3>{card.title}</h3>
              <ProgressiveImage
                className={styles.image}
                src={card.imageURL}
                width={card.imageWidth}
                height={card.imageHeight}
                alt={card.title}
              />
              <div className={styles.description}>{card.description}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
