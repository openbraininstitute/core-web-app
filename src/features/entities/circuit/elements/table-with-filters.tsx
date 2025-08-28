'use client';

import { ExpandableConfig, RowSelectionType } from 'antd/es/table/interface';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { CSSProperties, ReactNode } from 'react';
import type { TableProps } from 'antd';

import FilterControls from '@/components/explore-section/ExploreSectionListingView/FilterControls';
import ExploreSectionTable, {
  OnCellClick,
} from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import ResultsCount from '@/features/listing-filter-panel/numeric-results-info';
import WithListingFilterPanel from '@/features/listing-filter-panel';
import useExploreColumns from '@/hooks/useExploreColumns';

import { circuitRepresentationAtom } from '@/features/entities/circuit/elements/context';
import {
  sortStateAtom,
  useDataAtom,
  previousDataAtom,
  pageNumberAtom,
} from '@/state/explore-section/list-view-atoms';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { DataType, PAGE_NUMBER } from '@/constants/explore-section/list-views';
import { ExploreDataScope } from '@/types/explore-section/application';
import { classNames } from '@/util/utils';

import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

export interface Props<T extends ICircuit> {
  dataKey: string;
  dataType: DataType;
  dataScope: ExploreDataScope;
  onCellClick?: OnCellClick<T>;
  renderButton?: (props: RenderButtonProps<T>) => ReactNode;
  virtualLabInfo?: WorkspaceContext;
  containerClass?: string;
  tableClass?: string;
  onRowsSelected?: (rows: Array<T>) => void;
  selectionType?: RowSelectionType;
  tableScrollable?: boolean;
  controlsVisible?: boolean;
  style?: Record<'background', string>;
  showLoadingState?: boolean;
  useBrainRegion?: boolean;
  rowClassName?: string | TableProps<T>['rowClassName'];
  tableStyle?: CSSProperties | undefined;
  onRow?: TableProps<T>['onRow'];
  rowKey: TableProps<T>['rowKey'];
  expandableConfig?: ExpandableConfig<T>;
}

export default function TableWithFilters<T extends ICircuit>({
  dataKey,
  dataType,
  dataScope,
  renderButton,
  onCellClick,
  selectionType,
  virtualLabInfo,
  onRowsSelected,
  tableScrollable = true,
  controlsVisible = true,
  style = { background: 'bg-[#d1d1d1]' },
  containerClass = 'h-full',
  tableClass = 'h-full overflow-y-hidden',
  showLoadingState = true,
  useBrainRegion = true,
  rowClassName,
  tableStyle,
  onRow,
  rowKey,
  expandableConfig = undefined,
}: Props<T>) {
  const { node } = useBrainRegionHierarchy({ dataKey });
  const view = useAtomValue(circuitRepresentationAtom);

  const dataKeyExpand = useBrainRegion ? `${dataKey}/${node.id}` : dataKey;
  const hierarchyExpandKey = `${dataKeyExpand}/hierarchy`;
  const brainRegionId = useBrainRegion ? node.id : undefined;
  const [sortState, setSortState] = useAtom(sortStateAtom({ key: dataKeyExpand }));

  const setPrevData = useSetAtom(
    previousDataAtom({
      workspace: virtualLabInfo,
      dataType,
      dataScope,
      brainRegionId,
      key: view === 'hierarchy' ? hierarchyExpandKey : dataKeyExpand,
    })
  );
  const setPageNumber = useSetAtom(pageNumberAtom(dataKeyExpand));

  const onSortChange = (newSortState: any) => {
    setPageNumber(PAGE_NUMBER);
    setPrevData([]);
    setSortState(newSortState);
  };

  const columns = useExploreColumns<T>(onSortChange, sortState, [], dataType);

  const { result: dataSource, isLoading } = useDataAtom<T>({
    dataType,
    dataScope,
    brainRegionId,
    workspace: virtualLabInfo,
    key: view === 'hierarchy' ? hierarchyExpandKey : dataKeyExpand,
  });

  return (
    <div
      className={classNames(containerClass, style.background)}
      data-testid="explore-section-listing-view"
    >
      <div
        className={classNames(
          tableClass,
          'relative grid w-full grid-cols-[auto_max-content] grid-rows-1 overflow-x-auto',
          tableScrollable && 'max-h-[calc(100vh-3.3rem)]'
        )}
      >
        <WithListingFilterPanel
          useBrainRegion={useBrainRegion}
          dataType={dataType}
          dataScope={dataScope}
          virtualLabInfo={virtualLabInfo}
          dataKey={view === 'hierarchy' ? hierarchyExpandKey : dataKeyExpand}
          className="relative"
        >
          {({ activeColumns, displayControlPanel, setDisplayControlPanel, filters }) => (
            <>
              <FilterControls
                filters={filters}
                displayControlPanel={displayControlPanel}
                dataType={dataType}
                dataScope={dataScope}
                dataKey={view === 'hierarchy' ? hierarchyExpandKey : dataKeyExpand}
                setDisplayControlPanel={setDisplayControlPanel}
                className="sticky top-0 px-4 py-5"
              >
                {view === 'flat' && (
                  <ResultsCount
                    dataType={dataType}
                    dataScope={dataScope}
                    virtualLabInfo={virtualLabInfo}
                    dataKey={dataKeyExpand}
                    useBrainRegion={useBrainRegion}
                  />
                )}
              </FilterControls>
              <ExploreSectionTable<T>
                columns={columns.filter(({ key }) => (activeColumns || []).includes(key as string))}
                dataContext={{ virtualLabInfo, dataScope, dataType }}
                dataSource={dataSource}
                loading={showLoadingState && isLoading}
                onCellClick={onCellClick}
                renderButton={renderButton}
                selectionType={selectionType}
                scrollable={tableScrollable}
                controlsVisible={controlsVisible}
                onRowsSelected={onRowsSelected}
                dataKey={view === 'hierarchy' ? hierarchyExpandKey : dataKeyExpand}
                useBrainRegion={useBrainRegion}
                rowClassName={rowClassName}
                tableStyle={tableStyle}
                onRow={onRow}
                rowKey={rowKey}
                expandableConfig={expandableConfig}
                defaultDisplayLoadMore={view === 'flat'}
              />
            </>
          )}
        </WithListingFilterPanel>
      </div>
    </div>
  );
}
