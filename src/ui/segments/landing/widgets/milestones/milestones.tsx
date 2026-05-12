'use client';

/* eslint-disable react/no-array-index-key */
import React from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { IconChevronLeft } from '@/ui/segments/landing/icons/icon-chevron-left';
import { IconChevronRight } from '@/ui/segments/landing/icons/icon-chevron-right';
import { styleBlockFullWidth } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import Button from './button';

import type { ContentForMilestones } from '@/services/sanity/api/get-milestones';

import '@/ui/segments/landing/styles.module.css';

import styles from './milestones.module.css';

interface MilestonesProps {
  className?: string;
  data: ContentForMilestones;
}

export default function WidgetMilestones({ className, data }: MilestonesProps) {
  const [index, setIndex] = React.useState(0);
  const milestone = data[index];
  const handlePrev = () => {
    if (data.length < 1) return;

    setIndex((index - 1 + data.length) % data.length);
  };
  const handleNext = () => {
    if (data.length < 1) return;

    setIndex((index + 1) % data.length);
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
          {data.map((_, idx) => (
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
