'use client';

import { EnumSection } from '@/components/LandingPage/sections/sections';
import useScrollHasStarted from '@/hooks/use-scroll-has-started';
import { classNames } from '@/util/utils';

import VerticalSpace from '../../components/VerticalSpace';
import FooterPanel from '../FooterPanel';
import Menu from '../Menu';

import type { ReactNode } from 'react';

import styles from '../../LandingPage.module.css';

export default function ShowcaseDetailLayout({ children }: { children: ReactNode }) {
  const scrollHasStarted = useScrollHasStarted();

  return (
    <div className={classNames(styles.landingPage)}>
      <Menu scrollHasStarted={scrollHasStarted} section={EnumSection.Showcases} />
      {children}
      <VerticalSpace height="30px" />
      <FooterPanel />
    </div>
  );
}
