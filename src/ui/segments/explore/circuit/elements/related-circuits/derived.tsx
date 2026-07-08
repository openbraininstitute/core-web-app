import { snakeCase } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';

import { getCircuitDerivationLabel } from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { WorkspaceScope } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { activeColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { createExpandableTableConfig } from '@/ui/segments/data-table/expandable-row/expandable-base-table';
import { useExpandableTable } from '@/ui/segments/data-table/expandable-row/use-expandable-table';
import { BaseTable } from '@/ui/segments/data-table/table';
import { expandIcon } from '@/ui/segments/explore/circuit/elements/expand-icon';
import { RecursiveExpandableTable } from '@/ui/segments/explore/circuit/elements/recursive-expandable-table';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TDerivationType } from '@/api/entitycore/types/entities/derivation';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { VirtualLabInfo } from '@/types/virtual-lab/common';
import type { HierarchyOutputNode, ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';
import type { DerivedGroup } from '@/ui/segments/explore/circuit/use-hierarchy';
import type { KebabCase } from '@/utils/type';

type Props = {
  groups: DerivedGroup[];
};

export function Derived({ groups }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ derivationType, circuits }) => (
        <DerivedGroupSection
          key={derivationType}
          derivationType={derivationType}
          circuits={circuits}
        />
      ))}
    </div>
  );
}

function DerivedGroupSection({
  derivationType,
  circuits,
}: {
  derivationType: TDerivationType;
  circuits: HierarchyOutputNode[];
}) {
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

  const onCellClick = (basePath: string, record: ICircuit) => {
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
    renderWrapper: (baseTable: ReactNode, records: Array<ICircuit>) => {
      return (
        <div className="my-5 flex flex-col items-start gap-5">
          <div className="ml-2 flex flex-row items-center gap-2">
            <ArrowReturnRight className="text-neutral-3 text-3xl" />
            <div className="text-neutral-3 text-lg font-semibold uppercase">Derived circuits</div>
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
    <div className="flex flex-col gap-2">
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
        dataSource={circuits}
        onCellClick={onCellClick}
        expandableConfig={expandableConfig}
      />
    </div>
  );
}
