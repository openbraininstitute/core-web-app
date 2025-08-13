'use client';

import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import Link from 'next/link';

import useInfiniteScroll, { useIntersectionObserver } from '@/hooks/virtual-labs/infinite-scroll';
import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import {
  resolveExperimentUrlByExtendedType,
  resolveExploreDetailsPageUrl,
} from '@/utils/url-builder';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { EntityTypeDict } from '@/api/entitycore/types';
import { resolveDataKey } from '@/utils/key-builder';
import { classNames } from '@/util/utils';
import {
  ModelTilesConfig,
  ScopeSelector,
  useTileScopeQuery,
} from '@/components/VirtualLab/ScopeSelector';

import type { WorkspaceContext } from '@/types/common';
import Styles from '@/styles/vlabs.module.css';

export default function StartNewSimulation() {
  const { type } = useTileScopeQuery();

  const model = ModelTilesConfig.find((o) => o.type === type);
  const dataType = model?.entities?.build?.extendedType;
  const entity = getEntityByExtendedType({
    type: dataType,
  });

  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const dataKey = resolveDataKey({ projectId, section: 'simulate', entity, suffix: entity?.slug });
  const selectedRows = useAtomValue(selectedRowsAtom(dataKey));

  const tableRef = useRef<HTMLDivElement>(null);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const loadMoreDiv = useInfiniteScroll(virtualLabId, projectId, dataType!, dataKey);

  useIntersectionObserver({
    observedRef: tableRef,
    onIntersect: setButtonsVisible,
    rootMargin: '0px',
  });

  return (
    <>
      <ScopeSelector />
      {/* TODO: replace this list with items saved in Model Library */}
      <div
        className="mb-5 flex w-full grow flex-col"
        id="explore-table-container-for-observable"
        ref={tableRef}
      >
        <ExploreSectionListingView
          containerClass="grow bg-primary-9 flex flex-col"
          tableClass={classNames('grow', Styles.table)}
          tableScrollable={false}
          controlsVisible={false}
          dataType={dataType!}
          dataScope={ExploreDataScope.NoScope}
          virtualLabInfo={{ virtualLabId, projectId }}
          selectionType="radio"
          renderButton={() => null}
          dataKey={dataKey}
          useBrainRegion={false}
          showLoadingState={false}
        />
        {buttonsVisible && selectedRows.length > 0 && (
          <div className="fixed right-[50px] bottom-8 flex items-center justify-end gap-2">
            {entity?.type !== EntityTypeDict.Circuit && (
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
            )}
            <Link
              className="bg-primary-9 flex h-12 items-center justify-center px-8 font-bold text-white hover:text-white"
              href={resolveExperimentUrlByExtendedType({
                ctx: { virtualLabId, projectId },
                dataType: entity?.extendedType,
                entityId: selectedRows[0].id,
              })}
            >
              New Simulation
            </Link>
          </div>
        )}
        {loadMoreDiv}
      </div>
    </>
  );
}
