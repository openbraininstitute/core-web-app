'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// The editor, Yjs and IndexedDB run in the browser only.
const App = dynamic(() => import('@/features/logbook/app/App').then((m) => m.App), {
  ssr: false,
});

/** The research logbook: its own request cache, then the board of the project in the address. */
export function Logbook() {
  // Collaboration data comes over the socket; REST answers change rarely: no refetch on every focus.
  const [queryClient] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <div className="logbook-root h-full max-h-[calc(100vh-6rem)] w-full overflow-hidden bg-background text-primary-9">
        <App />
      </div>
    </QueryClientProvider>
  );
}
