import React from 'react';

import Hero from '../../Hero';
import VideoURL from './home.mp4';

import WholeHistory from './WholeHistory';
import { classNames } from '@/util/utils';

import styles from './SectionMain.module.css';

export interface MainSectionProps {
  className?: string;
}

export default function SectionMain({ className }: MainSectionProps) {
  return (
    <div className={classNames(className, styles.sectionMain)}>
      <Hero
        title="Launch your virtual lab and perform neuroscience at the speed of thought"
        backgroundType="video"
        backgroundURL={VideoURL}
        next="Discover the whole story"
      />
      <WholeHistory />
    </div>
  );
}
