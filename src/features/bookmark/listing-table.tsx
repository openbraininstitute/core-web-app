import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';

import ExploreSectionTable from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import WithControlPanel from '@/features/listing-filter-panel';
import FilterControls from '@/components/explore-section/ExploreSectionListingView/FilterControls';
import useExploreColumns from '@/hooks/useExploreColumns';
import Footer from '@/features/bookmark/footer';

import { useBrainRegionHierarchy } from '@/features/brain-region-tree/v2/brain-region/context';
import { sortStateAtom, useDataAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { DataType } from '@/constants/explore-section/list-views';
import type { WorkspaceContext } from '@/types/common';

interface Props extends WorkspaceContext {
  dataType: DataType;
  targetIds: Array<string>;
  dataKey: string;
}

export default function ListingTable<T extends EntityCoreIdentifiable>({
  virtualLabId,
  projectId,
  dataType,
  targetIds,
  dataKey,
}: Props) {
  const { push: navigate } = useRouter();
  const [sortState, setSortState] = useAtom(sortStateAtom({ dataType, key: dataKey }));
  const columns = useExploreColumns<T>(setSortState, sortState, [], null, dataType);
  const { node } = useBrainRegionHierarchy({ dataKey: dataKey });
  const dataScope = ExploreDataScope.BookmarkedResources;

  const dataSource = useDataAtom<T>({
    dataType,
    dataScope,
    targetIds,
    shouldUseIds: true,
    workspace: { virtualLabId, projectId },
    brainRegionId: node.id,
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
                dataKey={dataKey}
                columns={columns.filter(({ key }) => (activeColumns || []).includes(key as string))}
                dataContext={{
                  dataScope: ExploreDataScope.BookmarkedResources,
                  virtualLabInfo: { virtualLabId, projectId },
                  dataType,
                }}
                dataSource={dataSource}
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
