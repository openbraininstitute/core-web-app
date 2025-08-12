'use client';

import { useParams } from 'next/navigation';
import { WorkspaceContext } from '@/types/common';

export function useWorkspace() {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  return { virtualLabId, projectId };
}

export default useWorkspace;
