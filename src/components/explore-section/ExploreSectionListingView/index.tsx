import { ReactNode, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { RowSelectionType } from 'antd/es/table/interface';

import FilterControls from './FilterControls';
import { RenderButtonProps } from './useRowSelection';
import { ExploreESHit } from '@/types/explore-section/es';
import ExploreSectionTable, {
  OnCellClick,
} from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import WithControlPanel from '@/components/explore-section/ExploreSectionListingView/WithControlPanel';
import NumericResultsInfo from '@/components/explore-section/ExploreSectionListingView/NumericResultsInfo';
import useExploreColumns from '@/hooks/useExploreColumns';
import { sortStateAtom, dataAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { ExploreSectionResource } from '@/types/explore-section/resources';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { useLoadableValue } from '@/hooks/hooks';
import { classNames } from '@/util/utils';

export default function ExploreSectionListingView({
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
}: {
  containerClass?: string;
  tableClass?: string;
  dataType: DataType;
  dataScope: ExploreDataScope;
  renderButton?: (props: RenderButtonProps) => ReactNode;
  onRowsSelected?: (rows: ExploreESHit<ExploreSectionResource>[]) => void;
  onCellClick?: OnCellClick;
  selectionType?: RowSelectionType;
  virtualLabInfo?: VirtualLabInfo;
  tableScrollable?: boolean;
  controlsVisible?: boolean;
  style?: Record<'background', string>;
  dataKey: string;
}) {
  const [sortState, setSortState] = useAtom(sortStateAtom({ dataType, key: dataKey }));

  const [dataSource, setDataSource] = useState<ExploreESHit<ExploreSectionResource>[]>();
  const columns = useExploreColumns(setSortState, sortState, [], null, dataType);

  const data = useLoadableValue(
    dataAtom({
      dataType,
      dataScope,
      virtualLabInfo,
      key: dataKey,
    })
  );

  useEffect(() => {
    if (data.state === 'hasData' && !!data.data) {
      setDataSource(data.data.hits as ExploreESHit<ExploreSectionResource>[]);
    }
  }, [data, setDataSource]);

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
        <WithControlPanel
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
              <ExploreSectionTable
                columns={columns.filter(({ key }) => (activeColumns || []).includes(key as string))}
                dataContext={{ virtualLabInfo, dataScope, dataType }}
                dataSource={dataSource}
                loading={data.state === 'loading'}
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
        </WithControlPanel>
      </div>
    </div>
  );
}
