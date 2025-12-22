import React from 'react';

import { fetchSanity } from '@/services/sanity/client';
import { logError } from '@/util/logger';

export function useSanity<T>(
  query: string,
  typeGuard: (data: unknown) => data is T
): T | undefined | null {
  const [data, setData] = React.useState<T | undefined | null>(undefined);
  React.useEffect(() => {
    fetchSanity(query, typeGuard)
      .then(setData)
      .catch((ex) => {
        logError('There was an exception in this Sanity query:', query);
        logError(ex);
        setData(null);
      });
  }, [query, typeGuard]);
  return data;
}
