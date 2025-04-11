'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ArrowLeftOutlined } from '@ant-design/icons';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import GenericButton from '@/components/Global/GenericButton';

type Props = {
  children: ReactNode;
};

export default function BrainConfigSelectorLayout({ children }: Props) {
  return (
    <div className="bg-primary-9 flex min-h-screen gap-20 p-8 text-white">
      <div className="flex flex-col">
        <span className="text-4xl font-bold">New</span>
        <span className="text-2xl">Simulation Campaign</span>
        <GenericButton
          className="border-primary-3 text-primary-3 mt-6 flex items-center justify-around border"
          text={
            <>
              <ArrowLeftOutlined />
              Back to Main
            </>
          }
          href="/main"
        />
      </div>

      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <div className="grow">{children}</div>
      </ErrorBoundary>
    </div>
  );
}
