'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { loadable } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { Subcircuits } from '@/features/entities/circuit/elements/related-circuits/subcircuits';
import { DerivedFrom } from '@/features/entities/circuit/elements/related-circuits/derived-from';
import { hierarchyAllLevelsAtomFamily } from '@/features/entities/circuit/elements/context';
import { Derived } from '@/features/entities/circuit/elements/related-circuits/derived';
import { Parent } from '@/features/entities/circuit/elements/related-circuits/parent';
import { Root } from '@/features/entities/circuit/elements/related-circuits/root';
import { useUnwrappedValue } from '@/hooks/hooks';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';

type Props = {
  circuit: ICircuit;
};

export default function RelatedCircuits({ circuit }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const key = `related-circuits/${virtualLabId}/${projectId}/${circuit.id}`;

  const result = useUnwrappedValue(
    hierarchyAllLevelsAtomFamily(
      useMemo(
        () => ({
          entityId: circuit.id,
          virtualLabId,
          projectId,
          key,
        }),
        [circuit.id, virtualLabId, projectId, key]
      )
    )
  );

  const isLoading =
    useAtomValue(
      loadable(
        hierarchyAllLevelsAtomFamily(
          useMemo(
            () => ({
              entityId: circuit.id,
              virtualLabId,
              projectId,
              key,
            }),
            [circuit.id, virtualLabId, projectId, key]
          )
        )
      )
    ).state === 'loading';

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center py-10">
        <LoadingOutlined className="text-primary-7" />
      </div>
    );
  }

  return (
    <div className="mt-5">
      <Tabs defaultMessage="No subcircuits found">
        <Tab label="Parent circuit" visible={Boolean(circuit.root_circuit_id)}>
          <Parent data={result?.parent} />,
        </Tab>
        <Tab label="Root circuit" visible={Boolean(circuit.root_circuit_id)}>
          <Root circuit={circuit} />,
        </Tab>
        <Tab label="Derived from" visible={Boolean(result?.derivedFrom)}>
          <DerivedFrom data={result?.derivedFrom} />,
        </Tab>
        <Tab
          label="Subcircuits"
          visible={Boolean(result?.subCircuits?.at(0)?.sub_circuits?.length)}
        >
          <Subcircuits data={result?.subCircuits} />,
        </Tab>
        <Tab
          label="Derived circuits"
          visible={Boolean(result?.derived?.at(0)?.sub_circuits?.length)}
        >
          <Derived data={result?.derived} />
        </Tab>
      </Tabs>
    </div>
  );
}
