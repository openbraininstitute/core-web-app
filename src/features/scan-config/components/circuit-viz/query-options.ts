/** Query options for circuit resources, which are fixed for a given circuit id. */
export const STATIC_RESOURCE_QUERY_OPTIONS = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
} as const;
