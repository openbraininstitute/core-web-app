'use client';

import { HTMLProps, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { match } from 'ts-pattern';
import Link from 'next/link';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';
import useInfiniteScroll from '@/hooks/virtual-labs/infinite-scroll';
import BookmarkButton from '@/features/bookmark/control';

import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { Btn } from '@/components/buttons/base/legacy-btn';
import { classNames } from '@/util/utils';
import {
  ModelTilesConfig,
  ScopeSelector,
  ScopeSelectorSmall,
  SectionTabs,
  useTileScopeQuery,
} from '@/components/VirtualLab/ScopeSelector';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { resolveDataKey } from '@/utils/key-builder';
import { ensureArray } from '@/utils/array';

import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

import Styles from '@/styles/vlabs.module.css';

export default function Page() {
  const { section, selectedTab } = useTileScopeQuery();

  const content = match({ section, selectedTab })
    .with({ section: 'build', selectedTab: 'new' }, () => <ScopeSelector />)
    .with({ section: 'build', selectedTab: 'browse' }, () => <BrowseModelsTab />)
    .otherwise(() => null);

  return (
    <div className="flex min-h-screen w-full flex-col gap-5 pt-8 pr-5">
      <SectionTabs />
      {content}
    </div>
  );
}

function BrowseModelsTab() {
  const { type } = useTileScopeQuery();

  const [expanded, setExpanded] = useState(false);
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const model = ModelTilesConfig.find((o) => o.id === type);
  const dataType = model?.entities?.build?.extendedType;

  const entity = getEntityByExtendedType({
    type: dataType!,
  });

  const dataKey = resolveDataKey({
    projectId,
    section: 'build',
    entity,
  });

  const selectedRows = useAtomValue(selectedRowsAtom(dataKey));

  const loadMoreDiv = useInfiniteScroll(virtualLabId, projectId, dataType!, dataKey);
  const onMenuExpand = (value: boolean) => setExpanded(value);

  return (
    <>
      <div className="flex grow flex-col">
        <ScopeSelectorSmall expanded={expanded} onMenuExpand={onMenuExpand} />

        {dataType &&
        dataType !== ExtendedEntitiesTypeDict.PairedNeuronCircuit &&
        dataType !== ExtendedEntitiesTypeDict.SmallMicrocircuit ? (
          <div
            id="explore-table-container-for-observable"
            className={classNames(
              'mb-5 flex w-full grow flex-col',
              expanded ? 'bg-black opacity-30' : ''
            )}
          >
            <ExploreSectionListingView<EntityCoreIdentifiableNamed>
              tableScrollable={false}
              controlsVisible={false}
              dataType={dataType}
              dataScope={ExploreDataScope.NoScope}
              virtualLabInfo={{ virtualLabId, projectId }}
              selectionType="radio"
              style={{ background: 'bg-white' }}
              containerClass="grow  flex flex-col"
              tableClass={classNames('grow', Styles.table)}
              dataKey={dataKey}
              useBrainRegion={false}
              showLoadingState={false}
            />
            {loadMoreDiv}
            {selectedRows.length > 0 && (
              <div className="fixed right-[45px] bottom-12 flex items-center justify-end gap-2">
                <Link
                  className="bg-primary-9 flex h-12 items-center justify-center px-8 font-bold text-white hover:text-white"
                  href={resolveExploreDetailsPageUrl({
                    ctx: { virtualLabId, projectId },
                    dataType,
                    entityId: selectedRows[0].id,
                  })}
                >
                  View
                </Link>
                {entity && entity.isBookmarkable && (
                  <BookmarkButton
                    virtualLabId={virtualLabId}
                    projectId={projectId}
                    entityId={selectedRows[0].id}
                    resourceId={ensureArray({ input: selectedRows[0] }).at(0)?.legacy_id}
                    type={entity.type}
                    customButton={customBookmarkButton}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="m-auto w-fit border p-6">Coming Soon</div>
        )}
      </div>
    </>
  );
}

function customBookmarkButton({ onClick, children }: HTMLProps<HTMLButtonElement>) {
  return (
    <Btn className="bg-secondary-2 h-12 px-8" onClick={onClick}>
      {children}
    </Btn>
  );
}
