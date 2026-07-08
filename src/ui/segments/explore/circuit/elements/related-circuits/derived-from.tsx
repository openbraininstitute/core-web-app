'use client';

import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { getCircuitDerivationLabel } from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { WorkspaceScope } from '@/constants';
import { activeColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { BaseTable } from '@/ui/segments/data-table/table';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';
import type { DerivedFromGroup } from '@/ui/segments/explore/circuit/use-hierarchy';

type Props = {
  groups: DerivedFromGroup[];
};

export function DerivedFrom({ groups }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const cols = useDataTableColumns<ICircuit>({
    dataType: ExtendedEntitiesTypeDict.Circuit,
    setSortState: undefined,
    sortState: undefined,
    initialColumns: [],
  });
  const activeColumns = useAtomValue(
    useMemo(
      () =>
        unwrap(
          activeColumnsAtom({
            dataType: ExtendedEntitiesTypeDict.Circuit,
            dataScope: WorkspaceScope.Custom,
            key: '',
          })
        ),
      []
    )
  );
  const columns = cols.filter(({ key }) => (activeColumns || []).includes(key as string));

  const onCellClick = (basePath: string, record: ICircuit) => {
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        dataType: ExtendedEntitiesTypeDict.Circuit,
        entityId: record.id,
      })
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ derivationType, circuit }) => (
        <div key={derivationType} className="flex flex-col gap-2">
          <div className="ml-2 flex flex-row items-center gap-2">
            <ArrowReturnRight className="text-neutral-3 text-3xl" />
            <div className="text-neutral-3 text-lg font-semibold uppercase">
              {getCircuitDerivationLabel(derivationType)}
            </div>
          </div>
          <BaseTable
            loading={false}
            wrapperClassname="[&_.ant-table-body]:max-h-full!"
            columns={columns}
            dataType={ExtendedEntitiesTypeDict.Circuit}
            dataSource={[circuit]}
            onCellClick={onCellClick}
            rowKey={(record: ICircuit) => `derived-from-${derivationType}-${record.id}`}
          />
        </div>
      ))}
    </div>
  );
}
