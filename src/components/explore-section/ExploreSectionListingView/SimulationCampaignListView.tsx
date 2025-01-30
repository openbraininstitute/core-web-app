import { useEffect, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { axesAtom } from '../Simulations/state';
import NumericResultsInfo from './NumericResultsInfo';
import FilterControls from './FilterControls';
import ListTable from '@/components/ListTable';
import WithListingFilterPanel from '@/components/explore-section/ExploreSectionListingView/WithControlPanel';
import useExploreColumns from '@/hooks/useExploreColumns';
import {
  activeColumnsAtom,
  dataAtom,
  sortStateAtom,
  dimensionColumnsAtom,
} from '@/state/explore-section/list-view-atoms';
import { DataType } from '@/constants/explore-section/list-views';
import { ExploreDataScope } from '@/types/explore-section/application';

export default function SimulationCampaignListView({ dataType }: { dataType: DataType }) {
  const activeColumns = useAtomValue(
    useMemo(() => unwrap(activeColumnsAtom({ dataType, key: dataType })), [dataType])
  );
  const dataSource = useAtomValue(
    useMemo(() => unwrap(dataAtom({ dataType, key: dataType })), [dataType])
  );

  const [sortState, setSortState] = useAtom(sortStateAtom({ dataType, key: dataType }));
  const dimensionColumns = useAtomValue(
    useMemo(() => unwrap(dimensionColumnsAtom({ dataType, key: dataType })), [dataType])
  );
  const columns = useExploreColumns(setSortState, sortState, [], dimensionColumns).filter(
    ({ key }) => (activeColumns || []).includes(key as string)
  );

  const loading = !dataSource || !dimensionColumns;

  /* Resets the dimensions axes when changing to list view so that when the next Campaign is viewd users
   don'see invalid dimensions from another campaign */
  const setAxes = useSetAtom(axesAtom);

  useEffect(() => {
    setAxes({ xAxis: undefined, yAxis: undefined });
  }, [setAxes]);

  return (
    <div className="flex h-full max-h-screen min-h-screen w-full bg-[#d1d1d1]">
      <div className="relative grid h-full w-full grid-cols-[auto_max-content] grid-rows-1 overflow-x-auto overflow-y-hidden">
        <WithListingFilterPanel
          dataType={dataType}
          dataScope={ExploreDataScope.NoScope}
          className="relative"
          dataKey={dataType}
        >
          {({ displayControlPanel, setDisplayControlPanel }) => (
            <>
              <div className="sticky top-0 grid w-full grid-cols-[max-content_1fr_max-content] items-center justify-between gap-5 px-5">
                <NumericResultsInfo
                  dataType={dataType}
                  dataScope={ExploreDataScope.NoScope}
                  dataKey={dataType}
                />
                <FilterControls
                  displayControlPanel={displayControlPanel}
                  setDisplayControlPanel={setDisplayControlPanel}
                  dataType={dataType}
                  dataKey={dataType}
                />
              </div>
              <div className="h-full w-full px-4">
                <ListTable
                  {...{
                    columns,
                    dataSource: dataSource?.hits,
                    loading,
                  }}
                />
              </div>
            </>
          )}
        </WithListingFilterPanel>
      </div>
    </div>
  );
}
