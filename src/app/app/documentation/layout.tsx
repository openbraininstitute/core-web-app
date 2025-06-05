'use client';

import GlobalSideMenu from '@/components/documentation/global/global-side-menu';
import DocumentationSideBloc from '@/components/documentation/global/side-bloc';

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-screen bg-primary-9 p-8">
      <div className="fixed left-0 top-0 flex h-screen w-[255px] flex-col justify-between p-8 ">
        <DocumentationSideBloc />
        <GlobalSideMenu />
      </div>

      <main className="ml-[255px] w-2/3">{children}</main>
    </div>
  );
}
