'use client';

import { redirect, usePathname, useSearchParams } from 'next/navigation';

export default function DetailPage() {
  const path = usePathname();
  const query = useSearchParams();

  redirect(`${path}/overview?${query.toString()}`);
}
