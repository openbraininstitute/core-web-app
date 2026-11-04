import { classNames } from '@/util/utils';

import { styleLayout } from '../styles';

import type { ReactNode } from 'react';

import styles from './page-section.module.css';

/**
 * A section of a page held a section at a time (`.landing-page-snap`): a stop for the scroll and a dot on `SectionRail`,
 * at least a screen tall, its content in the middle of it. Taller than a screen, it scrolls freely inside.
 */
export default function PageSection({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section data-page-section className={classNames(className, styleLayout, styles.pageSection)}>
      {children}
    </section>
  );
}
