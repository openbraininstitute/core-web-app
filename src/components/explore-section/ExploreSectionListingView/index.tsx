'use client';

import { ExpandableConfig, RowSelectionType } from 'antd/es/table/interface';
import { CSSProperties, ReactNode } from 'react';

import { useAtom, useSetAtom } from 'jotai';
import type { TableProps } from 'antd';

import FilterControls from '@/components/explore-section/ExploreSectionListingView/FilterControls';
import ExploreSectionTable, {
  OnCellClick,
} from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import ResultsCount from '@/features/listing-filter-panel/numeric-results-info';
import WithListingFilterPanel from '@/features/listing-filter-panel';
import useExploreColumns from '@/hooks/useExploreColumns';

import {
  sortStateAtom,
  useDataAtom,
  previousDataAtom,
  pageNumberAtom,
} from '@/state/explore-section/list-view-atoms';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType, PAGE_NUMBER } from '@/constants/explore-section/list-views';
import { classNames } from '@/util/utils';

import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { WorkspaceContext } from '@/types/common';

export interface Props<T extends EntityCoreIdentifiable> {
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
  enableDownload?: boolean;
  useBrainRegion?: boolean;
  rowClassName?: string | TableProps<T>['rowClassName'];
  tableStyle?: CSSProperties | undefined;
  onRow?: TableProps<T>['onRow'];
  expandableConfig?: ExpandableConfig<T>;
}

export default function ExploreSectionListingView<T extends EntityCoreIdentifiable>({
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
  expandableConfig = undefined,
  enableDownload = true,
}: Props<T>) {
  const { node } = useBrainRegionHierarchy({ dataKey });

  const dataKeyExpand = useBrainRegion ? `${dataKey}/${node.id}` : dataKey;
  const brainRegionId = useBrainRegion ? node.id : undefined;
  const [sortState, setSortState] = useAtom(sortStateAtom({ key: dataKeyExpand }));

  const setPrevData = useSetAtom(
    previousDataAtom({
      workspace: virtualLabInfo,
      dataType,
      dataScope,
      brainRegionId,
      key: dataKeyExpand,
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
    key: dataKeyExpand,
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
          dataKey={dataKeyExpand}
          className="relative"
        >
          {({ activeColumns, displayControlPanel, setDisplayControlPanel, filters }) => (
            <>
              <FilterControls
                filters={filters}
                displayControlPanel={displayControlPanel}
                dataType={dataType}
                dataScope={dataScope}
                dataKey={dataKeyExpand}
                setDisplayControlPanel={setDisplayControlPanel}
                className="sticky top-0 px-4 py-5"
              >
                <ResultsCount
                  dataType={dataType}
                  dataScope={dataScope}
                  virtualLabInfo={virtualLabInfo}
                  dataKey={dataKeyExpand}
                  useBrainRegion={useBrainRegion}
                />
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
                dataKey={dataKeyExpand}
                useBrainRegion={useBrainRegion}
                rowClassName={rowClassName}
                tableStyle={tableStyle}
                onRow={onRow}
                expandableConfig={expandableConfig}
                enableDownload={enableDownload}
              />
            </>
          )}
        </WithListingFilterPanel>
      </div>
    </div>
  );
}
