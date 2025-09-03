'use client';

import { redirect, usePathname } from 'next/navigation';

export default function DetailPage() {
  const path = usePathname();
  redirect(`${path}/overview`);
}
