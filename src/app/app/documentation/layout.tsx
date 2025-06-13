'use client';

import DocumentationSideBloc from '@/components/documentation/global/side-bloc';

import SideBarNavigation from '@/components/documentation/global/side-bar-navigation';
import { classNames } from '@/util/utils';
import styles from './styles.module.css';

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary-9 relative min-h-screen w-screen">
      <SideBarNavigation />
      <div
        className={classNames(
          'fixed top-0 left-[40px] flex h-screen w-[255px] flex-col justify-between overflow-y-scroll p-8',
          styles['hide-scrollbar']
        )}
      >
        <DocumentationSideBloc />
      </div>

      <main className="ml-[320px] w-2/3 py-8">{children}</main>
    </div>
  );
}
