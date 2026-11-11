'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

import type { WorkspaceContext } from '@/types/common';

export function useWorkspace() {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  return useMemo(() => ({ virtualLabId, projectId }), [virtualLabId, projectId]);
}

export default useWorkspace;
