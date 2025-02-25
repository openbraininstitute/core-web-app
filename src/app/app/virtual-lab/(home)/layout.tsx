'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import VirtualLabTopMenu from '@/components/VirtualLab/VirtualLabTopMenu';
import Logo from '@/components/logo/as-svg';

export default function VirtualLabPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-primary-9 p-10 text-white">
      <div className="flex flex-row items-start justify-between">
        <Logo className="text-white" />
        <VirtualLabTopMenu />
      </div>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>
    </div>
  );
}
