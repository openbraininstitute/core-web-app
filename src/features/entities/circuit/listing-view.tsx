import { ReactNode, ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'antd';
import dynamic from 'next/dynamic';

import DownloadPanel from '@/features/entities/circuit/elements/download-panel';
import useExploreColumns from '@/hooks/useExploreColumns';

import { createExpandableTableConfig } from '@/components/explore-section/ExploreSectionListingView/expandable-row/expandable-base-table';
import { useExpandableTable } from '@/components/explore-section/ExploreSectionListingView/expandable-row/use-expandable-table';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { ExploreDataScope } from '@/types/explore-section/application';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { resolveDataKey } from '@/utils/key-builder';
import { ChevronRight } from '@/components/icons';
import { detailUrlBuilder } from '@/util/common';
import { classNames } from '@/util/utils';

import type { Props as ExploreSectionListingViewProps } from '@/components/explore-section/ExploreSectionListingView';
import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

const DefaultTable = dynamic(
  () => import('@/components/explore-section/ExploreSectionListingView'),
  {
    ssr: false,
  }
) as unknown as (props: ExploreSectionListingViewProps<ICircuit>) => ReactElement | null;

const createSubCircuitTable = (baseTable: ReactNode) => {
  return (
    <div className="my-5 flex flex-col items-start gap-5">
      <div className="ml-2 flex flex-row items-center gap-2">
        <ArrowReturnRight className="text-neutral-4 text-3xl" />
        <div className="text-neutral-4 text-lg font-semibold uppercase">subcircuits</div>
      </div>
      <div className="w-full">
        <div className="ml-4">{baseTable}</div>
      </div>
    </div>
  );
};

const expandIcon = ({
  expanded,
  onExpand,
  record,
}: {
  expanded: boolean;
  onExpand: (record: ICircuit, event: React.MouseEvent<HTMLElement>) => void;
  record: ICircuit;
}) => {
  // Use the same logic as isRowExpandable to determine if icon should be shown
  if (!record.sub_circuits?.length) return null;
  return (
    <Button type="text" onClick={(e) => onExpand(record, e)}>
      <ChevronRight
        fill="#003a8c"
        className={classNames(
          'transform transition-transform duration-200 ease-in-out',
          expanded ? 'rotate-90' : 'rotate-0'
        )}
      />
    </Button>
  );
};

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
    fetcher: async (record: ICircuit): Promise<Array<ICircuit>> => {
      // If sub_circuits data is already present in the record, use it directly
      if (record.sub_circuits && record.sub_circuits.length > 0) {
        return record.sub_circuits;
      }

      // Otherwise, fetch the circuit data and return its sub_circuits
      const fetchedCircuit = await getCircuit({
        id: record.root_circuit_id,
        context: virtualLabInfo,
      });

      return fetchedCircuit.sub_circuits || [];
    },
    fetcherParams: virtualLabInfo,
    getRowKey: (record) => record.id,
    getFetchId: (record) => record.id,
    isRowExpandable: (record) => Boolean(record.sub_circuits?.length),
    persistCache: true,
    expandedColumns: neededColumns,
    expandedTableProps: {
      dataContext: {
        dataScope: ExploreDataScope.NoScope,
        dataType,
        virtualLabInfo,
      },
    },
    renderWrapper: createSubCircuitTable,
    expandIconColumnIndex: 4,
    expandIcon,
  });

  const { expandableConfig } = useExpandableTable<ICircuit, VirtualLabInfo>(expandableOptions);

  return (
    <>
      <DefaultTable
        {...{
          dataKey,
          dataType,
          dataScope,
          onCellClick,
          renderButton,
          virtualLabInfo,
          useBrainRegion: true,
          expandableConfig,
          selectionType: undefined,
          onRowsSelected: undefined,
        }}
      />
      <DownloadPanel />
    </>
  );
}
