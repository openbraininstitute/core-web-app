'use client';

import { useParams } from 'next/navigation';
import SimulationConfig from '@/features/small-microcircuit';
import { WorkspaceContext } from '@/types/common';

type Params = WorkspaceContext & { circuit_id: string };

export default function SmallMicroCircuitConfiguration() {
  const { circuit_id: circuitId, virtualLabId, projectId } = useParams<Params>();
  return (
    <SimulationConfig circuitId={circuitId} virtualLabId={virtualLabId} projectId={projectId} />
  );
}
