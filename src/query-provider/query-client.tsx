import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';
import superjson from 'superjson';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: false,
      },
      mutations: {
        retry: false,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        /*
        As of React Query v5.40.0, you don't have to await all prefetches for this to work,
        as pending Queries can also be dehydrated and sent to the client.
        This lets you kick off prefetches as early as possible without letting them block an entire Suspense boundary,
        and streams the data to the client as the query finishes.
        This can be useful for example if you want to prefetch some content that is only visible after some user interaction,
        or say if you want to await and render the first page of an infinite query,
        but start prefetching page 2 without blocking rendering.
         */
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        shouldRedactErrors: () => false,
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
