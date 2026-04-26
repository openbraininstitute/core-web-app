'use client';

import { EnumSection } from '@/components/LandingPage/sections/sections';
import { classNames } from '@/util/utils';

import VerticalSpace from '../../components/VerticalSpace';
import FooterPanel from '../FooterPanel';
import Menu from '../Menu';

import type { ReactNode } from 'react';

import styles from '../../LandingPage.module.css';

export default function ShowcaseDetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className={classNames(styles.landingPage)}>
      <Menu scrollHasStarted section={EnumSection.Showcases} />
      <div className="pt-32">{children}</div>
      <VerticalSpace height="30px" />
      <FooterPanel />
    </div>
  );
}
