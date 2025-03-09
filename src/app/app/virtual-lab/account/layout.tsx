import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideBar from '@/components/VirtualLab/side-bar/account-sidebar';
import User from '@/components/VirtualLab/create-entity-flows/common/user';

type Props = {
  children: ReactNode;
};

export default function layout({ children }: Props) {
  return (
    <div className="flex h-screen flex-col bg-primary-9 p-5 text-white">
      <div className="no-scrollbar h-full gap-12 overflow-y-auto overflow-x-hidden">
        <SideBar />
        <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
          <div className="ml-80 flex h-full w-[calc(100%-20rem)] flex-grow flex-col">
            <User />
            <div className="h-full w-full flex-grow">{children}</div>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
