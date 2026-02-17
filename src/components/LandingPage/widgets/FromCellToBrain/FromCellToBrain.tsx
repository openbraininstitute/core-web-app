import { classNames } from '@/util/utils';

import ProgressiveImage from '../../components/ProgressiveImage';
import SwipeableCardsList from '../../components/swipeable-cards-list';
import { styleBlockLarge } from '../../styles';
import { useMenuHeight } from '../../utils.client';
import { useSanityContentForFromCelltoBrainContent } from './hooks';

import styles from './FromCellToBrain.module.css';

interface WidgetFromCellToBrainProps {
  className?: string;
}

export function WidgetFromCellToBrain({ className }: WidgetFromCellToBrainProps) {
  const columns = useSanityContentForFromCelltoBrainContent();
  const menuHeight = useMenuHeight();

  return (
    <SwipeableCardsList
      className={classNames(className, styles.widgetFromCellToBrain, styleBlockLarge)}
      footerOnSmallScreen
      gap="0"
      style={{ '--custom-menu-height': `${menuHeight}px` }}
    >
      {columns.map((col) => (
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
