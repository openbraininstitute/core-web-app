'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { HTMLProps } from 'react';

import {
  SimulationScopeToDataType,
  SimulationScopeToModelType,
  SimulationType,
} from '@/types/virtual-lab/lab';

import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { to64, detailUrlBuilder } from '@/util/common';
import { ExploreESHit, ExploreResource } from '@/types/explore-section/es';
import { ExploreSectionResource } from '@/types/explore-section/resources';
import BookmarkButton from '@/components/buttons/bookmark';
import { SIMULATION_DATA_TYPES } from '@/constants/explore-section/data-types/simulation-data-types';
import { isSimulation } from '@/types/virtual-lab/bookmark';
import { Btn } from '@/components/Btn';
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
import Styles from '@/styles/vlabs.module.scss';

const SimTypeURLParams: Record<string, { view: string; model: string }> = {
  [SimulationType.SingleNeuron]: {
    view: 'single-neuron-simulation',
    model: 'explore/interactive/model/me-model',
  },
  [SimulationType.Synaptome]: {
    view: 'synaptome-simulation',
    model: 'explore/interactive/model/synaptome',
  },
};

export default function VirtualLabProjectSimulatePage({
  params,
}: {
  params: { virtualLabId: string; projectId: string };
}) {
  const [selectedTab] = useAtom(selectedTabFamily('simulate' + params.projectId));

  const renderContent = () => {
    if (selectedTab === 'new')
      return <NewSim projectId={params.projectId} virtualLabId={params.virtualLabId} />;

    return <BrowseSimsTab projectId={params.projectId} virtualLabId={params.virtualLabId} />;
  };

  return (
    <div className="flex min-h-screen w-full flex-col gap-5 pr-5 pt-8">
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

  const generateDetailUrl = (selectedRow: ExploreESHit<ExploreResource>) => {
    const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
    const baseBuildUrl = `${vlProjectUrl}/explore/simulate/${SimTypeURLParams[selectedSimType].view}/view`;
    return `${baseBuildUrl}/${to64(`${virtualLabId}/${projectId}!/!${selectedRow._id}`)}`;
  };

  const [expanded] = useAtom(scopeSelectorExpandedAtom(atomKey));

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
              />
            </div>
            {selectedRows.length > 0 && (
              <div className="fixed bottom-12 right-[60px] flex h-12 items-center justify-end gap-2">
                <Btn
                  type="button"
                  className="h-12 bg-primary-9 text-white hover:!bg-primary-7"
                  onClick={() => router.push(generateDetailUrl(selectedRows[0]))}
                >
                  View
                </Btn>
                {isSimulation(SIMULATION_DATA_TYPES[dataType].name) && (
                  <BookmarkButton
                    virtualLabId={virtualLabId}
                    projectId={projectId}
                    // `selectedRows` will be an array with only one element because `selectionType` is a radio button not a checkbox.
                    resourceId={selectedRows[0]?._source['@id']}
                    type={SIMULATION_DATA_TYPES[dataType].name}
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

  const onModelSelected = (model: ExploreESHit<ExploreSectionResource>) => {
    const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
    const baseBuildUrl = `${vlProjectUrl}/simulate/${selectedSimulationScope}/new`;
    router.push(`${detailUrlBuilder(baseBuildUrl, model)}`);
  };

  const navigateToDetailPage = (record: ExploreESHit<ExploreSectionResource>) => {
    const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
    const pathId = `${to64(`${record._source.project.label}!/!${record._id}`)}`;
    const baseExploreUrl = `${vlProjectUrl}/${SimTypeURLParams[selectedSimulationScope].model}`;
    router.push(`${baseExploreUrl}/${pathId}`);
  };

  const selectedRows = useAtomValue(selectedRowsAtom(projectId + 'simulate' + modelType));

  return (
    <>
      <ScopeSelector atomKey={atomKey} section="simulate" />

      <div className="flex grow flex-col">
        <div className="flex grow flex-col">
          {/* TODO: replace this list with items saved in Model Library */}
          <div
            className="relative mb-5 flex w-full grow flex-col"
            id="explore-table-container-for-observable"
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
            />
            {selectedRows.length > 0 && (
              <div className="absolute bottom-6 right-4 flex items-center justify-end gap-2">
                <Btn
                  type="button"
                  className="h-12  bg-primary-9 text-white hover:!bg-primary-7"
                  onClick={() => navigateToDetailPage(selectedRows[0])}
                >
                  View
                </Btn>
                <Btn
                  className="h-12  bg-primary-9 text-white hover:!bg-primary-7"
                  onClick={() => onModelSelected(selectedRows[0])}
                >
                  New Simulation
                </Btn>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function customBookmarkButton({ onClick, children }: HTMLProps<HTMLButtonElement>) {
  return (
    <Btn className="h-12 bg-secondary-2 px-8" onClick={onClick}>
      {children}
    </Btn>
  );
}
