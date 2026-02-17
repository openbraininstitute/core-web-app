/* eslint-disable react/no-array-index-key */
import React from 'react';

import { classNames } from '@/util/utils';

import ProgressiveImage from '../../components/ProgressiveImage';
import { useSanityContentForMilestones } from '../../content/milestones';
import { IconChevronLeft } from '../../icons/IconChevronLeft';
import { IconChevronRight } from '../../icons/IconChevronRight';
import { styleBlockFullWidth } from '../../styles';
import Button from './button';

import '../../styles.module.css';

import styles from './milestones.module.css';

interface MilestonesProps {
  className?: string;
}

export default function WidgetMilestones({ className }: MilestonesProps) {
  const [index, setIndex] = React.useState(0);
  const milestones = useSanityContentForMilestones();
  const milestone = milestones[index];
  const handlePrev = () => {
    if (milestones.length < 1) return;

    setIndex((index - 1 + milestones.length) % milestones.length);
  };
  const handleNext = () => {
    if (milestones.length < 1) return;

    setIndex((index + 1) % milestones.length);
  };

  if (!milestone) return null;

  return (
    <div className={classNames(className, styles.milestones, styleBlockFullWidth)}>
      <hr className={styles.ruler} />
      <h1>{milestone.title}</h1>
      <div className={styles.counts}>
        {milestone.neurons && <div>{milestone.neurons} neurons</div>}
        {milestone.astrocytes && <div>{milestone.astrocytes} astrocytes</div>}
      </div>
      <p>{milestone.description}</p>
      <ProgressiveImage
        className={styles.image}
        src={milestone.imageURL}
        width={milestone.imageWidth}
        height={milestone.imageHeight}
      />
      <footer>
        <Button onClick={handlePrev}>
          <IconChevronLeft />
        </Button>
        <div>
          {milestones.map((_, idx) => (
            <Button key={`${idx}`} onClick={() => setIndex(idx)}>
              <div className={classNames(styles.dash, idx === index && styles.selected)} />
            </Button>
          ))}
        </div>
        <Button onClick={handleNext}>
          <IconChevronRight />
        </Button>
      </footer>
    </div>
  );
}
