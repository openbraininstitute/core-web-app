'use client';

import dynamic from 'next/dynamic';

export default dynamic(
  () => import('@/components/terms-of-use-acceptance/terms-of-use-acceptance'),
  { ssr: false }
);
