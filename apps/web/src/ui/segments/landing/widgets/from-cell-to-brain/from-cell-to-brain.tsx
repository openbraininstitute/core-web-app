'use client';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import SwipeableCardsList from '@/ui/segments/landing/components/swipeable-cards-list/swipeable-cards-list';
import { styleBlockLarge } from '@/ui/segments/landing/styles';
import { useMenuHeight } from '@/ui/segments/landing/utils.client';
import { classNames } from '@/util/utils';

import type { FromCellToBrainColumn } from '@/services/sanity/api/get-cell-to-brain';

import styles from './from-cell-to-brain.module.css';

interface WidgetFromCellToBrainProps {
  className?: string;
  data: FromCellToBrainColumn[];
}

export function WidgetFromCellToBrain({ className, data }: WidgetFromCellToBrainProps) {
  const menuHeight = useMenuHeight();

  return (
    <SwipeableCardsList
      className={classNames(className, styles.widgetFromCellToBrain, styleBlockLarge)}
      footerOnSmallScreen
      gap="0"
      style={{ '--custom-menu-height': `${menuHeight}px` }}
    >
      {data.map((col) => (
        <div key={col.title} className={styles.column}>
          <header>{col.title}</header>
          {col.cards.map((card) => (
            <div key={card.title} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>{card.title}</h2>
                <ProgressiveImage
                  className={styles.image}
                  src={card.imageURL}
                  width={card.imageWidth}
                  height={card.imageHeight}
                  alt={card.title}
                />
              </div>
              <div className={styles.description}>{card.description}</div>
            </div>
          ))}
        </div>
      ))}
    </SwipeableCardsList>
  );
}
