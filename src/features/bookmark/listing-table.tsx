import { useRouter } from 'next/navigation';
import { useAtom, useSetAtom } from 'jotai';

import ExploreSectionTable from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import FilterControls from '@/components/explore-section/ExploreSectionListingView/FilterControls';
import WithControlPanel from '@/features/listing-filter-panel';
import useExploreColumns from '@/hooks/useExploreColumns';
import Footer from '@/features/bookmark/footer';

import {
  sortStateAtom,
  useDataAtom,
  previousDataAtom,
  pageNumberAtom,
} from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { PAGE_NUMBER } from '@/constants/explore-section/list-views';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { DataType } from '@/constants/explore-section/list-views';
import type { WorkspaceContext } from '@/types/common';

interface Props extends WorkspaceContext {
  dataType: DataType;
  dataKey: string;
}

export default function ListingTable<T extends EntityCoreIdentifiable>({
  virtualLabId,
  projectId,
  dataType,
  dataKey,
}: Props) {
  const { push: navigate } = useRouter();
  const setPrevData = useSetAtom(
    previousDataAtom({
      workspace: { virtualLabId, projectId },
      dataType,
      dataScope: ExploreDataScope.BookmarkedResources,
      brainRegionId: undefined,
      key: dataKey,
    })
  );
  const setPageNumber = useSetAtom(pageNumberAtom(dataKey));
  const [sortState, setSortState] = useAtom(sortStateAtom({ key: dataKey }));

  const onSortChange = (newSortState: any) => {
    setPageNumber(PAGE_NUMBER);
    setPrevData([]);
    setSortState(newSortState);
  };

  const columns = useExploreColumns<T>(onSortChange, sortState, [], dataType);
  const dataScope = ExploreDataScope.BookmarkedResources;

  const { result: dataSource, isLoading } = useDataAtom<T>({
    dataType,
    dataScope,
    shouldUseIds: true,
    workspace: { virtualLabId, projectId },
    brainRegionId: undefined,
    key: dataKey,
  });

  const onCellClick = (_: string, record: T) => {
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId: record.id,
        dataType,
      })
    );
  };

  return (
    <div
      id="bookmark-list-container"
      data-testid={`bookmark-${dataType}-tab-panel`}
      className="h-full w-full"
    >
      <div className="overflow-x-hidden">
        <WithControlPanel
          dataType={dataType}
          dataScope={ExploreDataScope.BookmarkedResources}
          virtualLabInfo={{ virtualLabId, projectId }}
          dataKey={dataKey}
          useBrainRegion={false}
        >
          {({ activeColumns, displayControlPanel, setDisplayControlPanel, filters }) => (
            <>
              <FilterControls
                filters={filters}
                displayControlPanel={displayControlPanel}
                dataType={dataType}
                dataScope={dataScope}
                setDisplayControlPanel={setDisplayControlPanel}
                className="sticky top-0 px-4 py-5"
                dataKey={dataKey}
              />
              <ExploreSectionTable<T>
                loading={isLoading}
                useBrainRegion={false}
                dataKey={dataKey}
                columns={columns.filter(({ key }) => (activeColumns || []).includes(key as string))}
                dataContext={{
                  dataScope: ExploreDataScope.BookmarkedResources,
                  virtualLabInfo: { virtualLabId, projectId },
                  dataType,
                }}
                dataSource={dataSource}
                selectionType="checkbox"
                onCellClick={onCellClick}
                renderButton={({ selectedRows, clearSelectedRows }) => (
                  <Footer
                    clearSelectedRows={clearSelectedRows}
                    selectedRows={selectedRows}
                    virtualLabId={virtualLabId}
                    projectId={projectId}
                    category={dataType}
                    dataKey={dataKey}
                  />
                )}
              />
            </>
          )}
        </WithControlPanel>
      </div>
    </div>
  );
}
