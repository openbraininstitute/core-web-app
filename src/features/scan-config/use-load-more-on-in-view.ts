'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

type Params = {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => void;
  rootMargin?: string;
};

export function useLoadMoreOnInView({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '160px',
}: Params) {
  const { ref, inView } = useInView({ rootMargin });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

  return ref;
}
