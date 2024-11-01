'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';

import { HTMLProps } from 'react';
import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import VirtualLabTopMenu from '@/components/VirtualLab/VirtualLabTopMenu';

import { SimulationScopeToDataType, SimulationType } from '@/types/virtual-lab/lab';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { to64 } from '@/util/common';
import { ExploreESHit, ExploreResource } from '@/types/explore-section/es';

import BookmarkButton from '@/components/explore-section/BookmarkButton';
import { SIMULATION_DATA_TYPES } from '@/constants/explore-section/data-types/simulation-data-types';
import { isSimulation } from '@/types/virtual-lab/bookmark';
import { Btn } from '@/components/Btn';
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

const SimTypeURLParams: { [key: string]: string } = {
  [SimulationType.SingleNeuron]: 'single-neuron-simulation',
  [SimulationType.Synaptome]: 'synaptome-simulation',
};

export default function VirtualLabProjectSimulatePage({
  params,
}: {
  params: { virtualLabId: string; projectId: string };
}) {
  const [selectedTab] = useAtom(selectedTabFamily('simulate' + params.projectId));

  const renderContent = () => {
    if (selectedTab === 'new')
      return <ScopeSelector projectId={params.projectId} section="simulate" />;

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
  const selectedSimType =
    useAtomValue(selectedSimTypeFamily('simulate' + projectId)) ?? 'single-neuron';

  const dataType = SimulationScopeToDataType[selectedSimType];

  const selectedRows = useAtomValue(
    selectedRowsAtom({ dataType: dataType ?? DataType.SingleNeuronSimulation })
  );

  const generateDetailUrl = (selectedRow: ExploreESHit<ExploreResource>) => {
    const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
    const baseBuildUrl = `${vlProjectUrl}/explore/simulate/${SimTypeURLParams[selectedSimType]}/view`;
    return `${baseBuildUrl}/${to64(`${virtualLabId}/${projectId}!/!${selectedRow._id}`)}`;
  };

  const [expanded] = useAtom(scopeSelectorExpandedAtom('simulate' + projectId));

  return (
    <>
      <div className="flex w-full grow flex-col">
        <ScopeSelectorSmall projectId={projectId} section="simulate" />
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
                onCellClick={(_, record) => router.push(generateDetailUrl(record))}
              />
            </div>
            {selectedRows.length > 0 && (
              <div className="fixed bottom-3 right-[60px] mb-6 flex items-center justify-end gap-2">
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

function customBookmarkButton({ onClick, children }: HTMLProps<HTMLButtonElement>) {
  return (
    <Btn className="h-12 bg-secondary-2 px-8" onClick={onClick}>
      {children}
    </Btn>
  );
}
