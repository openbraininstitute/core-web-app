import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { pathToResource } from '@/util/explore-section/detail-view';
import usePathname from '@/hooks/pathname';

export default function useResourceInfoFromPath() {
  const path = usePathname();
  const params = useSearchParams();

  const rev = params?.get('rev');

  return useMemo(() => pathToResource(path, rev), [path, rev]);
}
