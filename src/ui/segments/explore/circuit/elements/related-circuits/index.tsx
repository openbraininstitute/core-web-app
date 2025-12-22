'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';

import { Subcircuits } from '@/ui/segments/explore/circuit/elements/related-circuits/subcircuits';
import { DerivedFrom } from '@/ui/segments/explore/circuit/elements/related-circuits/derived-from';
import { Derived } from '@/ui/segments/explore/circuit/elements/related-circuits/derived';
import { Parent } from '@/ui/segments/explore/circuit/elements/related-circuits/parent';
import { useHierarchyAllLevels } from '@/ui/segments/explore/circuit/use-hierarchy';
import { Root } from '@/ui/segments/explore/circuit/elements/related-circuits/root';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  circuit: ICircuit;
};

export function RelatedCircuits({ circuit }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();

  const { isLoading, derived, derivedFrom, parent, subCircuits } = useHierarchyAllLevels({
    entityId: circuit.id,
    projectId,
    virtualLabId,
  });

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center py-10">
        <LoadingOutlined className="text-primary-7" />
      </div>
    );
  }

  return (
    <div className="mt-5">
      <Tabs defaultMessage="No related circuits found">
        <Tab label="Parent circuit" visible={Boolean(circuit.root_circuit_id)}>
          <Parent data={parent} />
        </Tab>
        <Tab label="Root circuit" visible={Boolean(circuit.root_circuit_id)}>
          <Root circuit={circuit} />
        </Tab>
        <Tab label="Derived from" visible={Boolean(derivedFrom)}>
          <DerivedFrom data={derivedFrom} />
        </Tab>
        <Tab label="Subcircuits" visible={Boolean(subCircuits?.at(0)?.sub_circuits?.length)}>
          <Subcircuits data={subCircuits} />
        </Tab>
        <Tab label="Derived circuits" visible={Boolean(derived?.at(0)?.sub_circuits?.length)}>
          <Derived data={derived} />
        </Tab>
      </Tabs>
    </div>
  );
}
