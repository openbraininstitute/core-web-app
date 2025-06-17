import { useEffect, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { unwrap } from 'jotai/utils';

import { axesAtom } from '../Simulations/state';
import ResultsCount from '../../../features/listing-filter-panel/numeric-results-info';
import FilterControls from './FilterControls';
import ListTable from '@/components/ListTable';
import WithListingFilterPanel from '@/features/listing-filter-panel';
import useExploreColumns from '@/hooks/useExploreColumns';
import {
  activeColumnsAtom,
  dataAtom,
  sortStateAtom,
  dimensionColumnsAtom,
  previousDataAtom,
  pageNumberAtom,
} from '@/state/explore-section/list-view-atoms';
import { DataType, PAGE_NUMBER } from '@/constants/explore-section/list-views';
import { ExploreDataScope } from '@/types/explore-section/application';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';

export default function SimulationCampaignListView({ dataType }: { dataType: DataType }) {
  const { node } = useBrainRegionHierarchy({ dataKey: dataType });
  const activeColumns = useAtomValue(
    useMemo(() => unwrap(activeColumnsAtom({ dataType, key: dataType })), [dataType])
  );
  const dataSource = useAtomValue(
    useMemo(
      () => unwrap(dataAtom({ dataType, key: dataType, brainRegionId: node.id })),
      [dataType, node.id]
    )
  );

  const [sortState, setSortState] = useAtom(sortStateAtom({ key: dataType }));
  const dimensionColumns = useAtomValue(
    useMemo(() => unwrap(dimensionColumnsAtom({ dataType, key: dataType })), [dataType])
  );

  const setPrevData = useSetAtom(
    previousDataAtom({
      workspace: undefined,
      dataType,
      dataScope: ExploreDataScope.NoScope,
      brainRegionId: node.id,
      key: dataType,
    })
  );
  const setPageNumber = useSetAtom(pageNumberAtom(dataType));

  const onSortChange = (newSortState: any) => {
    setPageNumber(PAGE_NUMBER);
    setPrevData([]);
    setSortState(newSortState);
  };

  const columns = useExploreColumns(onSortChange, sortState, [], dimensionColumns).filter(
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
                <ResultsCount
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
                    // @FIXME: The linter is right here: there is no `.hits` on dataSource.
                    dataSource: undefined, // dataSource?.hits,
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
