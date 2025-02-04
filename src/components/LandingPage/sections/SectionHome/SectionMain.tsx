import React from 'react';

import Hero from '../../Hero';
import { EnumSection } from '../sections';

import WholeHistory from './WholeHistory';
import { classNames } from '@/util/utils';

import styles from './SectionMain.module.css';

export interface MainSectionProps {
  className?: string;
}

export default function SectionMain({ className }: MainSectionProps) {
  return (
    <div className={classNames(className, styles.sectionMain)}>
      <Hero section={EnumSection.Home} />
      <WholeHistory />
    </div>
  );
}
