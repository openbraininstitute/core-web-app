import { notFound } from 'next/navigation';

import SimulationConfig from '@/features/small-microcircuit';

import { SmallMicrocircuit } from '@/entity-configuration/domain/model/small-microcircuit';
import { PairedNeuronCircuit } from '@/entity-configuration/domain/model/paired-neurons';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';

type Props = ServerSideComponentProp<
  WorkspaceContext & { circuit_type: EntitySlugValue; circuit_id: string },
  null
>;

const ALLOWED_TYPES = [SmallMicrocircuit.slug, PairedNeuronCircuit.slug];

export default async function SmallMicroCircuitConfiguration({ params }: Props) {
  const {
    circuit_id: circuitId,
    circuit_type: circuitType,
    virtualLabId,
    projectId,
  } = await params;

  if (!ALLOWED_TYPES.includes(circuitType)) {
    notFound();
  }

  return (
    <SimulationConfig circuitId={circuitId} virtualLabId={virtualLabId} projectId={projectId} />
  );
}
