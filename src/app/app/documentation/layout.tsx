'use client';

import DocumentationSideBloc from '@/components/documentation/global/side-bloc';

import SideBarNavigation from '@/components/documentation/global/side-bar-navigation';
import { classNames } from '@/util/utils';
import styles from './styles.module.css';

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-screen bg-primary-9">
      <SideBarNavigation />
      <div
        className={classNames(
          'fixed left-[40px] top-0 flex h-screen w-[255px] flex-col justify-between overflow-y-scroll p-8',
          styles['hide-scrollbar']
        )}
      >
        <DocumentationSideBloc />
      </div>

      <main className="ml-[320px] w-2/3 py-8">{children}</main>
    </div>
  );
}
