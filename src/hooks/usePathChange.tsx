'use client';

import { useEffect } from 'react';
import { ReadonlyURLSearchParams, usePathname, useSearchParams } from 'next/navigation';

export default function usePathChange({
  condition,
  cb,
}: {
  condition: (pathname: string | null, searchParams: ReadonlyURLSearchParams | null) => boolean;
  cb: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (condition(pathname, searchParams)) {
      cb();
    }
  }, [condition, pathname, searchParams]);

  return null;
}
