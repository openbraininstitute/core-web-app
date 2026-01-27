import { snakeCase } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { WorkspaceScope } from '@/constants';
import type { VirtualLabInfo } from '@/types/virtual-lab/common';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { activeColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { createExpandableTableConfig } from '@/ui/segments/data-table/expandable-row/expandable-base-table';
import { useExpandableTable } from '@/ui/segments/data-table/expandable-row/use-expandable-table';
import { BaseTable } from '@/ui/segments/data-table/table';
import { expandIcon } from '@/ui/segments/explore/circuit/elements/expand-icon';
import { RecursiveExpandableTable } from '@/ui/segments/explore/circuit/elements/recursive-expandable-table';
import type { HierarchyOutputNode, ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';
import type { KebabCase } from '@/utils/type';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

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

  const expandableOptions = createExpandableTableConfig<ICircuit, VirtualLabInfo>({
    fetcher: async (record: ICircuit) => {
      // Check if this circuit has subcircuits (it should be enriched at this point)
      const enrichedRecord = record as ICircuitEnriched;
      if (enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0) {
        return enrichedRecord.sub_circuits;
      }
      return [];
    },
    getRowKey: (record) => record.id,
    getFetchId: (record) => record.id,
    isRowExpandable: (record) => {
      const enrichedRecord = record as ICircuitEnriched;
      return Boolean(enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0);
    },
    expandedTableProps: {
      dataType: ExtendedEntitiesTypeDict.Circuit,
    },
    expandedColumns: columns,
    renderWrapper: (_baseTable: ReactNode, records: Array<ICircuit>) => {
      return (
        <div className="my-5 flex flex-col items-start gap-5">
          <div className="ml-2 flex flex-row items-center gap-2">
            <ArrowReturnRight className="text-neutral-4 text-3xl" />
            <div className="text-neutral-4 text-lg font-semibold uppercase">Derived circuits</div>
          </div>
          <div className="w-full">
            <div className="ml-4">
              <RecursiveExpandableTable
                view={null}
                circuits={records as Array<ICircuitEnriched>}
                columns={columns}
                dataType={ExtendedEntitiesTypeDict.Circuit}
                dataScope={WorkspaceScope.Custom}
                onCellClick={onCellClick}
                level={1}
              />
            </div>
          </div>
        </div>
      );
    },
    expandIconColumnIndex: dataType === ExtendedEntitiesTypeDict.Circuit ? 3 : 2,
    expandIcon,
    isTopLevel: true, // this is the main table that should sync with filter resets
  });

  const { expandableConfig } = useExpandableTable<ICircuit, VirtualLabInfo>(expandableOptions);

  return (
    <BaseTable
      loading={false}
      wrapperClassname="[&_.ant-table-body]:max-h-full!"
      columns={columns}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      dataSource={data}
      onCellClick={onCellClick}
      expandableConfig={expandableConfig}
      rowKey={(record: ICircuit) => `derived-hierarchy-${record.id}`}
    />
  );
}
