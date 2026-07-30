import { snakeCase } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { WorkspaceScope } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { activeColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { HierarchyOutputNode } from '@/ui/segments/explore/circuit/helpers';
import type { KebabCase } from '@/utils/type';

type Props = {
  data: HierarchyOutputNode[] | undefined;
};

export function Derived({ data }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;

  const cols = useDataTableColumns<ICircuit>({
    dataType,
    setSortState: undefined,
    sortState: undefined,
    initialColumns: [],
  });
  const activeColumns = useAtomValue(
    useMemo(
      () =>
        unwrap(
          activeColumnsAtom({
            dataType,
            dataScope: WorkspaceScope.Custom,
            key: '',
          })
        ),
      [dataType]
    )
  );
  const columns = cols.filter(({ key }) => (activeColumns || []).includes(key as string));

  const onCellClick = (_basePath: string, record: ICircuit) => {
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        dataType,
        entityId: record.id,
      })
    );
  };

  return (
    <CircuitRecursiveGrid
      columns={columns}
      dataType={dataType}
      circuits={data}
      onCellClick={onCellClick}
    />
  );
}
