import { ReactNode, ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';

import DownloadPanel from '@/features/entities/circuit/elements/download-panel';
import useExploreColumns from '@/hooks/useExploreColumns';

import { createExpandableTableConfig } from '@/components/explore-section/ExploreSectionListingView/expandable-row/expandable-base-table';
import { useExpandableTable } from '@/components/explore-section/ExploreSectionListingView/expandable-row/use-expandable-table';
import { RecursiveExpandableTable } from '@/features/entities/circuit/elements/recursive-expandable-table';
import { circuitRepresentationAtom } from '@/features/entities/circuit/elements/context';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { expandIcon } from '@/features/entities/circuit/elements/expand-icon';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { resolveDataKey } from '@/utils/key-builder';
import { detailUrlBuilder } from '@/util/common';

import type { Props as ExploreSectionListingViewProps } from '@/components/explore-section/ExploreSectionListingView';
import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { ICircuitEnriched } from '@/features/entities/circuit/elements/helpers';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

const TableWithFilters = dynamic(
  () => import('@/features/entities/circuit/elements/table-with-filters'),
  {
    ssr: false,
  }
) as unknown as (props: ExploreSectionListingViewProps<ICircuit>) => ReactElement | null;

export default function ListingView({
  dataType,
  dataScope,
  renderButton,
  virtualLabInfo,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: VirtualLabInfo;
  renderButton?: (props: RenderButtonProps<ICircuit>) => ReactNode;
}) {
  const { push: navigate } = useRouter();
  const view = useAtomValue(circuitRepresentationAtom);

  const onCellClick = (basePath: string, record: ICircuit) => {
    const exploreUrl = detailUrlBuilder(basePath, record);
    navigate(exploreUrl);
  };

  const allColumns = useExploreColumns<ICircuit>(undefined, undefined, [], dataType);
  const { columns } = { ...ViewsDefinitionRegistry[dataType] };
  const activeColumns = ['index', ...(columns || [])];
  const neededColumns = allColumns.filter(({ key }) =>
    (activeColumns || []).includes(key as string)
  );

  const entity = getEntityByLegacyType({ legacyType: dataType });
  const dataKey = resolveDataKey({
    section: 'explore',
    projectId: virtualLabInfo?.projectId,
    entity,
  });

  const expandableOptions = createExpandableTableConfig<ICircuit, VirtualLabInfo>({
    fetcher: async (record: ICircuit) => {
      const enrichedRecord = record as ICircuitEnriched;
      if (enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0) {
        return enrichedRecord.sub_circuits;
      }
      return [];
    },
    fetcherParams: virtualLabInfo,
    getRowKey: (record) => record.id,
    getFetchId: (record) => record.id,
    isRowExpandable: (record) => {
      const enrichedRecord = record as ICircuitEnriched;
      return Boolean(enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0);
    },
    expandedColumns: neededColumns,
    expandedTableProps: {
      dataContext: {
        dataScope: ExploreDataScope.NoScope,
        dataType,
        virtualLabInfo,
      },
    },
    renderWrapper: (baseTable: ReactNode, records: Array<ICircuit>) => {
      return (
        <div className="my-5 flex flex-col items-start gap-5">
          <div className="ml-2 flex flex-row items-center gap-2">
            <ArrowReturnRight className="text-neutral-4 text-3xl" />
            <div className="text-neutral-4 text-lg font-semibold uppercase">subcircuits</div>
          </div>
          <div className="w-full">
            <div className="ml-4">
              <RecursiveExpandableTable
                circuits={records as Array<ICircuitEnriched>}
                columns={neededColumns}
                dataType={dataType}
                dataScope={dataScope}
                virtualLabInfo={virtualLabInfo}
                onCellClick={onCellClick}
                level={1}
              />
            </div>
          </div>
        </div>
      );
    },
    expandIconColumnIndex: 4,
    expandIcon,
    isTopLevel: true,
  });

  const { expandableConfig } = useExpandableTable<ICircuit, VirtualLabInfo>(expandableOptions);

  return (
    <>
      <TableWithFilters
        {...{
          dataKey,
          dataType,
          dataScope,
          onCellClick,
          renderButton,
          virtualLabInfo,
          expandableConfig,
          useBrainRegion: true,
          selectionType: undefined,
          onRowsSelected: undefined,
          rowKey: (record: ICircuit) => `hierarchy-${record.id}`,
          rowClassName: (record: ICircuit) =>
            // eslint-disable-next-line no-nested-ternary
            'isFiltered' in record && record.isFiltered
              ? `filtered-in [&_td_svg]:text-primary-8!`
              : view === 'hierarchy'
                ? 'filtered-out bg-red [&_td]:bg-neutral-1! [&_td]:text-neutral-4!'
                : '[&_td_svg]:text-primary-8!',
        }}
      />
      <DownloadPanel />
    </>
  );
}
