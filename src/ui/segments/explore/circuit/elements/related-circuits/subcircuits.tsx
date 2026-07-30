import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { activeColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { HierarchyOutputNode } from '@/ui/segments/explore/circuit/helpers';

type Props = {
  data: HierarchyOutputNode[] | undefined;
};

export function Subcircuits({ data }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
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

  const onCellClick = (_basePath: string, record: ICircuit) => {
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        dataType: ExtendedEntitiesTypeDict.Circuit,
        entityId: record.id,
      })
    );
  };

  return (
    <CircuitRecursiveGrid
      columns={columns}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      circuits={data}
      onCellClick={onCellClick}
    />
  );
}
