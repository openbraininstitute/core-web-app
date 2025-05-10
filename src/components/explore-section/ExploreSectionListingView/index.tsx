'use client';

import { RowSelectionType } from 'antd/es/table/interface';
import { ReactNode } from 'react';
import { useAtom } from 'jotai';

import FilterControls from '@/components/explore-section/ExploreSectionListingView/FilterControls';
import ExploreSectionTable, {
  OnCellClick,
} from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import NumericResultsInfo from '@/features/listing-filter-panel/numeric-results-info';
import WithListingFilterPanel from '@/features/listing-filter-panel';
import useExploreColumns from '@/hooks/useExploreColumns';

import { sortStateAtom, dataAtom, useDataAtom } from '@/state/explore-section/list-view-atoms';
import { useBrainRegionHierarchy } from '@/features/brain-region-tree/v2/brain-region/context';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { useLoadableValue } from '@/hooks/hooks';
import { classNames } from '@/util/utils';

import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { WorkspaceContext } from '@/types/common';

export default function ExploreSectionListingView<T extends EntityCoreIdentifiable>({
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
  dataKey,
  showLoadingState = true,
}: {
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
  dataKey: string;
  showLoadingState?: boolean;
}) {
  const [sortState, setSortState] = useAtom(sortStateAtom({ dataType, key: dataKey }));
  const columns = useExploreColumns<T>(setSortState, sortState, [], null, dataType);
  const { node } = useBrainRegionHierarchy({ dataKey });

  const result = useLoadableValue(
    dataAtom({
      dataType,
      dataScope,
      workspace: virtualLabInfo,
      key: dataKey,
      brainRegionId: node.id,
    })
  );

  const dataSource = useDataAtom<T>({
    dataType,
    dataScope,
    workspace: virtualLabInfo,
    brainRegionId: node.id,
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
                <NumericResultsInfo
                  dataType={dataType}
                  dataScope={dataScope}
                  virtualLabInfo={virtualLabInfo}
                  dataKey={dataKey}
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
              />
            </>
          )}
        </WithListingFilterPanel>
      </div>
    </div>
  );
}
