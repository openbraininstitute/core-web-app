'use client';

import { CheckCircleFilled } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { HTMLProps, useState } from 'react';
import { useAtomValue } from 'jotai';
import Link from 'next/link';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';
import useInfiniteScroll from '@/hooks/virtual-labs/infinite-scroll';
import BookmarkButton from '@/features/bookmark/control';

import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { Btn } from '@/components/buttons/base/legacy-btn';
import { resolveDataKey } from '@/utils/key-builder';
import { ensureArray } from '@/utils/array';
import { classNames } from '@/util/utils';
import {
  ModelTilesConfig,
  ScopeSelectorSmall,
  useTileScopeQuery,
} from '@/components/VirtualLab/ScopeSelector';

import type { ISingleNeuronSimulationBase } from '@/api/entitycore/types/shared/neuron-simulation';
import type { WorkspaceContext } from '@/types/common';

import Styles from '@/styles/vlabs.module.css';

export default function BrowseSimulations() {
  const [expanded, setExpanded] = useState(false);
  const { type, selectedTab } = useTileScopeQuery();
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [, copyId, , copying] = useCopyToClipboard();
  const model = ModelTilesConfig.find((o) => o.id === type);
  const dataType =
    selectedTab === 'new'
      ? model?.entities?.build?.extendedType
      : model?.entities?.simulate?.extendedType;

  const entity = getEntityByExtendedType({
    type: dataType!,
  });

  const dataKey = resolveDataKey({
    projectId,
    section: 'simulate',
    entity,
    suffix: entity?.slug,
  });

  const selectedRows = useAtomValue<Array<ISingleNeuronSimulationBase>>(selectedRowsAtom(dataKey));

  const loadMoreDiv = useInfiniteScroll(virtualLabId, projectId, dataType!, dataKey);
  const onMenuExpand = (value: boolean) => setExpanded(value);

  return (
    <div className="flex w-full grow flex-col">
      <ScopeSelectorSmall expanded={expanded} onMenuExpand={onMenuExpand} />
      {dataType ? (
        <>
          <div
            id="explore-table-container-for-observable"
            className={classNames(
              'mb-5 flex h-full w-full flex-col overflow-x-auto',
              expanded ? 'bg-black opacity-30' : ''
            )}
          >
            <ExploreSectionListingView
              dataType={dataType}
              dataScope={ExploreDataScope.NoScope}
              virtualLabInfo={{ virtualLabId, projectId }}
              selectionType="radio"
              renderButton={() => null}
              tableScrollable={false}
              controlsVisible={false}
              style={{ background: 'bg-white' }}
              containerClass="flex flex-col grow"
              tableClass={classNames('overflow-y-auto grow', Styles.table)}
              dataKey={dataKey}
              showLoadingState={false}
              useBrainRegion={false}
            />
            {loadMoreDiv}
          </div>
          {selectedRows.length > 0 && (
            <div className="fixed right-[60px] bottom-12 flex h-12 items-center justify-end gap-2">
              {dataType === ExtendedEntitiesTypeDict.SimulationCampaign && (
                <Btn
                  className="bg-primary-8 h-12 px-8"
                  onClick={() => {
                    copyId(selectedRows.at(0)?.id!);
                  }}
                  loading={copying}
                  loadingIcon={<CheckCircleFilled className="animate-fade-in text-white" />}
                >
                  Copy Simulation Campaign ID
                </Btn>
              )}
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
              {entity && virtualLabId && projectId && entity.isBookmarkable && (
                <BookmarkButton
                  virtualLabId={virtualLabId}
                  projectId={projectId}
                  entityId={selectedRows[0].id}
                  resourceId={ensureArray({ input: selectedRows[0].legacy_id }).at(0)!}
                  type={entity.type}
                  customButton={customBookmarkButton}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <div className="m-auto w-fit border p-6">Coming Soon</div>
      )}
    </div>
  );
}

function customBookmarkButton({
  loading,
  onClick,
  children,
}: HTMLProps<HTMLButtonElement> & {
  loading?: boolean;
}) {
  return (
    <Btn
      loading={loading}
      disabled={loading}
      className="bg-secondary-2 h-12 px-8"
      onClick={onClick}
    >
      {children}
    </Btn>
  );
}
