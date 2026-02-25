import { usePathname, useSearchParams } from 'next/navigation';
import React from 'react';

import { browserHistoryReplace } from '@/utils/browser';

import type { BuildStepKeys } from './helpers';

export function useStepChangeHandler() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  return React.useCallback(
    (s: BuildStepKeys) => {
      const query = new URLSearchParams(searchParams);
      query.set('step', s);

      browserHistoryReplace(null, `${pathname}?${query.toString()}`);
    },
    [searchParams, pathname]
  );
}
