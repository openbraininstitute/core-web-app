import VerticalSpace from '@/ui/segments/landing/components/vertical-space';
import FooterServer from '@/ui/segments/landing/layout/footer/footer-server';
import Menu from '@/ui/segments/landing/layout/menu/menu';
import { EnumSection } from '@/ui/segments/landing/sections/sections';
import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';

import styles from '@/ui/segments/landing/landing-page.module.css';

export default function ShowcaseDetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className={classNames(styles.landingPage)}>
      <Menu scrollHasStarted section={EnumSection.Showcases} />
      <div className="pt-32">{children}</div>
      <VerticalSpace height="30px" />
      <FooterServer />
    </div>
  );
}
