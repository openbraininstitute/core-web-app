'use client';

import { RowSelectionType } from 'antd/es/table/interface';
import { ReactNode } from 'react';
import { useAtom } from 'jotai';

import FilterControls from '@/components/explore-section/ExploreSectionListingView/FilterControls';
import ExploreSectionTable, {
  OnCellClick,
} from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import ResultsCount from '@/features/listing-filter-panel/numeric-results-info';
import WithListingFilterPanel from '@/features/listing-filter-panel';
import useExploreColumns from '@/hooks/useExploreColumns';

import { sortStateAtom, dataAtom, useDataAtom } from '@/state/explore-section/list-view-atoms';
import { useBrainRegionHierarchy } from '@/features/brain-region-tree/v2/brain-region/context';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { getSectionFromDataKey } from '@/utils/key-builder';
import { useLoadableValue } from '@/hooks/hooks';
import { classNames } from '@/util/utils';

import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { WorkspaceContext } from '@/types/common';

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
}: {
  dataKey: string;
  containerClass?: string;
  tableClass?: string;
  dataType: DataType;
  dataScope: ExploreDataScope;
  renderButton?: (props: RenderButtonProps<T>) => ReactNode;
  onRowsSelected?: (rows: Array<T>) => void;
  onCellClick?: OnCellClick<T>;
  selectionType?: RowSelectionType;
  virtualLabInfo?: WorkspaceContext;
  tableScrollable?: boolean;
  controlsVisible?: boolean;
  style?: Record<'background', string>;
  showLoadingState?: boolean;
  useBrainRegion?: boolean;
}) {
  const [sortState, setSortState] = useAtom(sortStateAtom({ dataType, key: dataKey }));
  const columns = useExploreColumns<T>(setSortState, sortState, [], null, dataType);
  const { node } = useBrainRegionHierarchy({ dataKey: getSectionFromDataKey(dataKey) });

  const result = useLoadableValue(
    dataAtom({
      dataType,
      dataScope,
      workspace: virtualLabInfo,
      key: dataKey,
      brainRegionId: useBrainRegion ? node.id : undefined,
    })
  );

  const dataSource = useDataAtom<T>({
    dataType,
    dataScope,
    workspace: virtualLabInfo,
    brainRegionId: useBrainRegion ? node.id : undefined,
    key: dataKey,
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
          dataKey={dataKey}
          className="relative"
        >
          {({ activeColumns, displayControlPanel, setDisplayControlPanel, filters }) => (
            <>
              <FilterControls
                filters={filters}
                displayControlPanel={displayControlPanel}
                dataType={dataType}
                dataScope={dataScope}
                dataKey={dataKey}
                setDisplayControlPanel={setDisplayControlPanel}
                className="sticky top-0 px-4 py-5"
              >
                <ResultsCount
                  dataType={dataType}
                  dataScope={dataScope}
                  virtualLabInfo={virtualLabInfo}
                  dataKey={dataKey}
                  useBrainRegion={useBrainRegion}
                />
              </FilterControls>
              <ExploreSectionTable<T>
                columns={columns.filter(({ key }) => (activeColumns || []).includes(key as string))}
                dataContext={{ virtualLabInfo, dataScope, dataType }}
                dataSource={dataSource}
                loading={showLoadingState && result.state === 'loading'}
                onCellClick={onCellClick}
                renderButton={renderButton}
                selectionType={selectionType}
                scrollable={tableScrollable}
                controlsVisible={controlsVisible}
                onRowsSelected={onRowsSelected}
                dataKey={dataKey}
                useBrainRegion={useBrainRegion}
              />
            </>
          )}
        </WithListingFilterPanel>
      </div>
    </div>
  );
}
