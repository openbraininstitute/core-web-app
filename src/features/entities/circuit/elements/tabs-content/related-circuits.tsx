'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Collapse } from 'antd';
import { useParams } from 'next/navigation';
import { loadable } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import isNil from 'lodash/isNil';

import { Subcircuits } from '@/features/entities/circuit/elements/related-circuits/subcircuits';
import { DerivedFrom } from '@/features/entities/circuit/elements/related-circuits/derived-from';
import { hierarchyAllLevelsAtomFamily } from '@/features/entities/circuit/elements/context';
import { Derived } from '@/features/entities/circuit/elements/related-circuits/derived';
import { Parent } from '@/features/entities/circuit/elements/related-circuits/parent';
import { Root } from '@/features/entities/circuit/elements/related-circuits/root';
import { useUnwrappedValue } from '@/hooks/hooks';
import { classNames } from '@/util/utils';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

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

  const items = [
    {
      key: 'parent',
      label: 'Parent circuit',
      children: <Parent data={result?.parent} />,
      visible: Boolean(result?.parent),
    },
    {
      key: 'root',
      label: 'Root circuit',
      children: <Root circuit={circuit} />,
      visible: Boolean(circuit.root_circuit_id),
    },
    {
      key: 'derivedFrom',
      label: 'Derived from',
      children: <DerivedFrom data={result?.derivedFrom} />,
      visible: Boolean(result?.derivedFrom),
    },
    {
      key: 'subCircuits',
      label: 'Subcircuits',
      children: <Subcircuits data={result?.subCircuits} />,
      visible: Boolean(result?.subCircuits?.at(0)?.sub_circuits?.length),
    },
    {
      key: 'derived',
      label: 'Derived circuits',
      children: <Derived data={result?.derived} />,
      visible: Boolean(result?.derived?.at(0)?.sub_circuits?.length),
    },
  ].filter((item) => item.visible);

  const shouldAppear = items
    .filter((o) => o.visible)
    .map((o) => o.key)
    .filter((o) => !isNil(o));

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
      <Collapse
        ghost
        bordered={false}
        items={items}
        collapsible="header"
        defaultActiveKey={['parent', 'root', ...shouldAppear]}
        expandIcon={() => null}
        className={classNames(
          '[&_.ant-collapse-item]:mb-2',
          '[&_.ant-collapse-header]:bg-primary-8 [&_.ant-collapse-header]:border-none [&_.ant-collapse-header]:text-white!',
          '[&_.ant-collapse-header]:rounded-none! [&_.ant-collapse-header]:text-lg [&_.ant-collapse-header]:font-semibold'
        )}
      />
    </div>
  );
}
