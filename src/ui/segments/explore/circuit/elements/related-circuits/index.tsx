'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';

import { type TViewVariant, ViewVariant } from '@/constants';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { Derived } from '@/ui/segments/explore/circuit/elements/related-circuits/derived';
import { DerivedFrom } from '@/ui/segments/explore/circuit/elements/related-circuits/derived-from';
import { Parent } from '@/ui/segments/explore/circuit/elements/related-circuits/parent';
import { Root } from '@/ui/segments/explore/circuit/elements/related-circuits/root';
import { Subcircuits } from '@/ui/segments/explore/circuit/elements/related-circuits/subcircuits';
import { useHierarchyAllLevels } from '@/ui/segments/explore/circuit/use-hierarchy';
import { cn } from '@/utils/css-class';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  circuit: ICircuit;
  variant?: TViewVariant;
};

export function RelatedCircuits({ circuit, variant = ViewVariant.Light }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();

  const { isLoading, derived, derivedFrom, parent, subCircuits } = useHierarchyAllLevels({
    entityId: circuit.id,
    projectId,
    virtualLabId,
  });

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center py-10">
        <LoadingOutlined
          className={cn(variant === ViewVariant.Default ? 'text-white' : 'text-primary-7')}
        />
      </div>
    );
  }

  return (
    <div className={cn({ 'mt-5': variant !== ViewVariant.Default })}>
      <Tabs defaultMessage="No related circuits found" variant={variant}>
        <Tab label="Root circuit" visible={Boolean(circuit.root_circuit_id)}>
          <Root circuit={circuit} />
        </Tab>
        <Tab label="Parent circuit" visible={Boolean(circuit.root_circuit_id)}>
          <Parent data={parent} />
        </Tab>
        <Tab label="Subcircuits" visible={Boolean(subCircuits?.at(0)?.sub_circuits?.length)}>
          <Subcircuits data={subCircuits} />
        </Tab>
        <Tab label="Derived from" visible={derivedFrom.length > 0}>
          <DerivedFrom groups={derivedFrom} />
        </Tab>
        <Tab label="Derived circuits" visible={derived.length > 0}>
          <Derived groups={derived} />
        </Tab>
      </Tabs>
    </div>
  );
}
