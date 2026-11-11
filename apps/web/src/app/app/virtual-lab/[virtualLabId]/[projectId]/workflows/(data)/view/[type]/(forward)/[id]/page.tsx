'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function DetailPage(): null {
  const router = useRouter();
  const path = usePathname();
  const query = useSearchParams();

  useEffect(() => {
    router.replace(`${path}/overview?${query.toString()}`);
  }, [router, path, query]);

  return null;
}
