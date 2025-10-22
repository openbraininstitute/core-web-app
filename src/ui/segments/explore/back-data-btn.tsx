'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import Breadcrumb from '@/ui/molecules/breadcrumb';
import { ROOT_ROUTE } from '@/config';

import type { WorkspaceContext } from '@/types/common';

export function BackToDataButton({ virtualLabId, projectId }: WorkspaceContext) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);
  query.delete('mdv');

  return (
    <Breadcrumb>
      <Link href={`${ROOT_ROUTE}/${virtualLabId}/${projectId}/data?${query.toString()}`}>Data</Link>
    </Breadcrumb>
  );
}
