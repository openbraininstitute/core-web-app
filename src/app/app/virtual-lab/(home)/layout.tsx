import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SideBar from '@/components/VirtualLab/side-bar/home-sidebar';
import { ErrorComponent } from '@/components/GenericErrorFallback';

export default async function VirtualLabLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorComponent}>
      <div className="bg-primary-9 flex h-screen flex-col p-5 text-white">
        <div className="no-scrollbar h-full gap-12 overflow-x-hidden overflow-y-auto">
          <SideBar />
          <div className="ml-80 flex h-full w-[calc(100%-20rem)] grow flex-col">{children}</div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
