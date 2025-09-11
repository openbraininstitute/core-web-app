'use client';

import { useParams } from 'next/navigation';
import ContributeMorphologyConfiguration from '@/features/contribute/morphology';
import { WorkspaceContext } from '@/types/common';

type Params = WorkspaceContext & { circuit_id: string };

export default function MorphologyPage() {
  const params = useParams<Params>();
  const { virtualLabId, projectId, circuit_id } = params;

  return (
    <ContributeMorphologyConfiguration
      circuitId={circuit_id}
      virtualLabId={virtualLabId}
      projectId={projectId}
    />
  );
}
