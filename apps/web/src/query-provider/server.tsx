import 'server-only';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { cache } from 'react';

import { makeQueryClient } from '@/query-provider/query-client';

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export function HydrateClient({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
