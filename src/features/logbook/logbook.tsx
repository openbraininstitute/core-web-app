'use client';

import { isNotNil } from 'es-toolkit';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';

import { BoardSkeleton } from '@/features/logbook/elements/skeletons';
import { useRoute } from '@/features/logbook/router';

import type { FallbackProps } from 'react-error-boundary';

const LogbookRoot = dynamic(
  () => import('@/features/logbook/board/logbook-root').then((m) => m.LogbookRoot),
  { ssr: false, loading: () => <LoadingBoard /> }
);

function LoadingBoard() {
  return <BoardSkeleton withLog={isNotNil(useRoute().logId)} />;
}

function LogbookFailed({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <main className="grid h-full place-items-center p-4">
      <section
        className="logbook-card flex flex-col items-center gap-3 p-8 text-center"
        role="alert"
      >
        <h1 className="text-[22px] font-bold">The research logs could not be shown</h1>
        <p className="max-w-105 text-[15px] leading-normal text-neutral-4">
          {error instanceof Error ? error.message : 'Something went wrong.'}
        </p>
        <button type="button" className="btn-navy" onClick={resetErrorBoundary}>
          Try again
        </button>
      </section>
    </main>
  );
}

export function Logbook() {
  const route = useRoute();
  return (
    <div className="logbook-root h-full w-full overflow-x-clip bg-background text-primary-9">
      <ErrorBoundary FallbackComponent={LogbookFailed} resetKeys={[route.logId, route.pageId]}>
        <LogbookRoot />
      </ErrorBoundary>
    </div>
  );
}
