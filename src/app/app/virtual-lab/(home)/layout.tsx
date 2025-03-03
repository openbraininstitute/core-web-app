'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideBar from '@/components/VirtualLab/side-bar';

export default function VirtualLabPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-primary-9 p-10 text-white">
      <div className="grid h-full grid-cols-[max-content_1fr] gap-12 overflow-hidden">
        <SideBar />
        <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
          <div className="overflow-hidden">{children}</div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
