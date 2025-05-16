'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { HTMLProps, useRef, useState, use } from 'react';

import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import { SimulationScopeToDataType, SimulationScopeToModelType } from '@/types/virtual-lab/lab';

import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { detailUrlBuilder } from '@/util/common';
import BookmarkButton from '@/features/bookmark/control';
import { Btn } from '@/components/buttons/base/legacy-btn';
import { DataType } from '@/constants/explore-section/list-views';
import { ExploreDataScope } from '@/types/explore-section/application';
import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';
import VirtualLabTopMenu from '@/components/VirtualLab/VirtualLabTopMenu';
import { classNames } from '@/util/utils';
import {
  scopeSelectorExpandedAtom,
  selectedSimTypeFamily,
  selectedTabFamily,
} from '@/components/VirtualLab/ScopeSelector/state';
import {
  ScopeSelector,
  ScopeSelectorSmall,
  SectionTabs,
} from '@/components/VirtualLab/ScopeSelector';
import useInfiniteScroll, { useIntersectionObserver } from '@/hooks/virtual-labs/infinite-scroll';
import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { IMEModel } from '@/api/entitycore/types';
import Styles from '@/styles/vlabs.module.css';

export default function VirtualLabProjectSimulatePage(props: {
  params: Promise<{ virtualLabId: string; projectId: string }>;
}) {
  const params = use(props.params);
  const [selectedTab] = useAtom(selectedTabFamily('simulate' + params.projectId));

  const renderContent = () => {
    if (selectedTab === 'new')
      return <NewSim projectId={params.projectId} virtualLabId={params.virtualLabId} />;

    return <BrowseSimsTab projectId={params.projectId} virtualLabId={params.virtualLabId} />;
  };

  return (
    <div className="flex min-h-screen w-full flex-col gap-5 pt-8 pr-5">
      <VirtualLabTopMenu />
      <SectionTabs projectId={params.projectId} section="simulate" />
      {renderContent()}
    </div>
  );
}

function BrowseSimsTab({ projectId, virtualLabId }: { projectId: string; virtualLabId: string }) {
  const router = useRouter();
  const [selectedTab] = useAtom(selectedTabFamily('simulate' + projectId));
  const atomKey = 'simulate' + selectedTab + projectId;

  const selectedSimType = useAtomValue(selectedSimTypeFamily(atomKey));

  const dataType = SimulationScopeToDataType[selectedSimType];

  const selectedRows = useAtomValue(selectedRowsAtom(projectId + 'simulate' + dataType));

  const [expanded] = useAtom(scopeSelectorExpandedAtom(atomKey));

  const loadMoreDiv = useInfiniteScroll(
    virtualLabId,
    projectId,
    dataType ?? DataType.SingleNeuronSimulation,
    projectId + 'simulate' + dataType
  );

  const entity = getEntityByLegacyType({
    // @ts-expect-error
    // TODO: fix it when we have simulations
    legacyType: selectedSimType ?? DataType.CircuitMEModel,
  });

  if (selectedRows[0])
    console.log(
      resolveExploreDetailsPageUrl({
        ctx: {
          virtualLabId,
          projectId,
        },
        entityId: selectedRows[0].id,
        dataType,
      })
    );

  return (
    <>
      <div className="flex w-full grow flex-col">
        <ScopeSelectorSmall atomKey={atomKey} />
        {dataType && (
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
                dataKey={projectId + 'simulate' + dataType}
                showLoadingState={false}
              />
              {loadMoreDiv}
            </div>
            {selectedRows.length > 0 && (
              <div className="fixed right-[60px] bottom-12 flex h-12 items-center justify-end gap-2">
                <Btn
                  type="button"
                  className="bg-primary-9 hover:bg-primary-7! h-12 text-white"
                  onClick={() =>
                    router.push(
                      resolveExploreDetailsPageUrl({
                        ctx: {
                          virtualLabId,
                          projectId,
                        },
                        entityId: selectedRows[0].id,
                        dataType,
                      })
                    )
                  }
                >
                  View
                </Btn>
                {entity && entity.isBookmarkable && (
                  <BookmarkButton
                    virtualLabId={virtualLabId}
                    projectId={projectId}
                    entityId={entity.id} // TODO: fix it when whe have simulation data
                    // `selectedRows` will be an array with only one element because `selectionType` is a radio button not a checkbox.
                    resourceId={selectedRows[0].id}
                    type={
                      dataType === DataType.SingleNeuronSimulation
                        ? 'single_neuron_simulation'
                        : 'single_neuron_synaptome_simulation'
                    }
                    customButton={customBookmarkButton}
                  />
                )}
              </div>
            )}
          </>
        )}
        {!dataType && <div className="m-auto w-fit border p-6">Coming Soon</div>}
      </div>
    </>
  );
}

function NewSim({ projectId, virtualLabId }: { projectId: string; virtualLabId: string }) {
  const [selectedTab] = useAtom(selectedTabFamily('simulate' + projectId));
  const atomKey = 'simulate' + selectedTab + projectId;
  const router = useRouter();
  const selectedSimulationScope = useAtomValue(selectedSimTypeFamily(atomKey));
  const modelType = SimulationScopeToModelType[selectedSimulationScope] ?? DataType.CircuitMEModel;

  const onModelSelected = (model: EntityCoreIdentifiable) => {
    const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
    const baseBuildUrl = `${vlProjectUrl}/simulate/${selectedSimulationScope}/new`;
    router.push(`${detailUrlBuilder(baseBuildUrl, model)}`);
  };

  const selectedRows = useAtomValue(selectedRowsAtom(projectId + 'simulate' + modelType));

  console.log(selectedRows);

  const tableRef = useRef<HTMLDivElement>(null);

  const [buttonsVisible, setButtonsVisible] = useState(false);

  const loadMoreDiv = useInfiniteScroll(
    virtualLabId,
    projectId,
    modelType,
    projectId + 'simulate' + modelType
  );

  useIntersectionObserver({
    observedRef: tableRef,
    onIntersect: setButtonsVisible,
    rootMargin: '0px',
  });

  return (
    <>
      <ScopeSelector atomKey={atomKey} section="simulate" />

      {/* TODO: replace this list with items saved in Model Library */}
      <div
        className="relative mb-5 flex w-full grow flex-col"
        id="explore-table-container-for-observable"
        ref={tableRef}
      >
        <ExploreSectionListingView
          containerClass="grow bg-primary-9 flex flex-col"
          tableClass={classNames('grow', Styles.table)}
          tableScrollable={false}
          controlsVisible={false}
          dataType={modelType}
          dataScope={ExploreDataScope.NoScope}
          virtualLabInfo={{ virtualLabId, projectId }}
          selectionType="radio"
          renderButton={() => null}
          dataKey={projectId + 'simulate' + modelType}
          showLoadingState={false}
        />
        {buttonsVisible && selectedRows.length > 0 && (
          <div className="fixed right-[50px] bottom-8 flex items-center justify-end gap-2">
            <Btn
              type="button"
              className="bg-primary-9 hover:bg-primary-7! h-12 text-white"
              onClick={() =>
                router.push(
                  resolveExploreDetailsPageUrl({
                    ctx: { virtualLabId, projectId },
                    entityId: selectedRows[0]!.id,
                    dataType: DataType.CircuitMEModel,
                  })
                )
              }
            >
              View
            </Btn>
            <Btn
              className="bg-primary-9 hover:bg-primary-7! h-12 text-white"
              onClick={() => onModelSelected(selectedRows[0])}
            >
              New Simulation
            </Btn>
          </div>
        )}
        {loadMoreDiv}
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
