'use client';

import { useParams } from 'next/navigation';

import ContributeConfig from '@/features/contribute';
import { WorkspaceContext } from '@/types/common';

type Params = WorkspaceContext & { circuit_id: string };

export default function ContributeConfiguration() {
  const { virtualLabId, projectId } = useParams<Params>();

  return (
    <ContributeConfig
      circuitId="ee3bc6d2-2953-4c23-8272-82dbeb321943"
      virtualLabId={virtualLabId}
      projectId={projectId}
    />
  );
}
