'use client';

import dynamic from 'next/dynamic';

// The editor, Yjs and IndexedDB are browser-only.
const LogbookRoot = dynamic(
  () => import('@/features/logbook/board/LogbookRoot').then((m) => m.LogbookRoot),
  { ssr: false }
);

export function Logbook() {
  return (
    <div className="logbook-root h-full w-full overflow-x-clip bg-background text-primary-9">
      <LogbookRoot />
    </div>
  );
}
