'use client';

import { HTMLProps } from 'react';

import { useAtom, useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';

import { DataType } from '@/constants/explore-section/list-views';
import { Btn } from '@/components/Btn';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { to64 } from '@/util/common';
import { MODEL_DATA_TYPES } from '@/constants/explore-section/data-types/model-data-types';
import { ExploreDataScope } from '@/types/explore-section/application';
import { SimulationScopeToModelType, SimulationType } from '@/types/virtual-lab/lab';
import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';
import BookmarkButton from '@/components/explore-section/BookmarkButton';

import VirtualLabTopMenu from '@/components/VirtualLab/VirtualLabTopMenu';
import { ExploreSectionResource } from '@/types/explore-section/resources';
import { ExploreESHit } from '@/types/explore-section/es';
import { isModel } from '@/types/virtual-lab/bookmark';
import { classNames } from '@/util/utils';
import {
  ScopeSelector,
  ScopeSelectorSmall,
  SectionTabs,
} from '@/components/VirtualLab/ScopeSelector';
import {
  scopeSelectorExpandedAtom,
  selectedSimTypeFamily,
  selectedTabFamily,
} from '@/components/VirtualLab/ScopeSelector/state';
import Styles from '@/styles/vlabs.module.scss';

type Params = {
  params: {
    projectId: string;
    virtualLabId: string;
  };
};

type SimURLs = {
  newUrl: string;
  viewUrl: string;
};

const SimTypeURLs: { [key: string]: SimURLs } = {
  [SimulationType.SingleNeuron]: {
    newUrl: 'build/me-model/new',
    viewUrl: 'explore/interactive/model/me-model',
  },
  [SimulationType.Synaptome]: {
    newUrl: 'build/synaptome/new',
    viewUrl: 'explore/interactive/model/synaptome',
  },
};

export default function VirtualLabProjectBuildPage({ params }: Params) {
  const router = useRouter();
  const [selectedTab] = useAtom(selectedTabFamily('build' + params.projectId));
  const [selectedSimType] = useAtom(selectedSimTypeFamily('build' + params.projectId));

  const URLs = selectedSimType && SimTypeURLs[selectedSimType];

  const renderContent = () => {
    if (selectedTab === 'new')
      return (
        <ScopeSelector
          projectId={params.projectId}
          section="build"
          handleBuildClick={() => {
            if (!URLs) return;
            router.push(URLs.newUrl);
          }}
        />
      );

    return <BrowseModelsTab projectId={params.projectId} virtualLabId={params.virtualLabId} />;
  };

  return (
    <div className="flex min-h-screen w-full flex-col gap-5 pr-5 pt-8">
      <VirtualLabTopMenu />
      <SectionTabs projectId={params.projectId} section="build" />
      {renderContent()}
    </div>
  );
}

function BrowseModelsTab({ projectId, virtualLabId }: { projectId: string; virtualLabId: string }) {
  const router = useRouter();
  const selectedSimType =
    useAtomValue(selectedSimTypeFamily('build' + projectId)) ?? SimulationType.SingleNeuron;

  const selectedModelType = SimulationScopeToModelType[selectedSimType];

  const selectedRows = useAtomValue(
    selectedRowsAtom({ dataType: selectedModelType ?? DataType.CircuitMEModel })
  );

  const [expanded] = useAtom(scopeSelectorExpandedAtom('build' + projectId));

  // Note: Disabled temporarily until SFN
  // const generateCloneUrl = () => {
  //   const model = selectedRows[0];
  //   if (model && selectedModelType) {
  //     const vlProjectUrl = generateVlProjectUrl(params.virtualLabId, params.projectId);
  //     const baseBuildUrl = `${vlProjectUrl}/${SupportedTypeToTabDetails[selectedModelType].newUrl}`;
  //     return `${baseBuildUrl}?mode=clone&model=${to64(model._source['@id'])}`;
  //   }
  // };

  // const onCloneModel = () => {
  //   switch (selectedSimulationScope) {
  //     case SimulationType.Synaptome: {
  //       return generateCloneUrl();
  //     }
  //     default:
  //       return undefined;
  //   }
  // };

  const navigateToDetailPage = (
    _basePath: string,
    record: ExploreESHit<ExploreSectionResource>
  ) => {
    switch (selectedSimType) {
      case SimulationType.SingleNeuron:
      case SimulationType.Synaptome: {
        const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
        const pathId = `${to64(`${record._source.project.label}!/!${record._id}`)}`;
        const baseExploreUrl = `${vlProjectUrl}/${SimTypeURLs[selectedSimType].viewUrl}`;
        router.push(`${baseExploreUrl}/${pathId}`);
        break;
      }
      default:
        break;
    }
  };

  return (
    <>
      <div className="flex grow flex-col">
        <ScopeSelectorSmall projectId={projectId} section="build" />
        {selectedModelType ? (
          <div
            id="explore-table-container-for-observable"
            className={classNames(
              'mb-5 flex w-full grow flex-col',
              expanded ? 'bg-black opacity-30' : ''
            )}
          >
            <ExploreSectionListingView
              tableScrollable={false}
              controlsVisible={false}
              dataType={selectedModelType ?? DataType.CircuitMEModel}
              dataScope={ExploreDataScope.NoScope}
              virtualLabInfo={{ virtualLabId, projectId }}
              selectionType="radio"
              style={{ background: 'bg-white' }}
              containerClass="grow bg-primary-9 flex flex-col"
              tableClass={classNames('grow', Styles.table)}
              onCellClick={navigateToDetailPage}
            />

            {selectedRows.length > 0 && (
              <div className="fixed bottom-3 right-[60px] mb-6 flex items-center justify-end gap-2">
                {isModel(MODEL_DATA_TYPES[selectedModelType].name) && (
                  <BookmarkButton
                    virtualLabId={virtualLabId}
                    projectId={projectId}
                    // `selectedRows` will be an array with only one element because `selectionType` is a radio button not a checkbox.
                    resourceId={selectedRows[0]?._source['@id']}
                    type={MODEL_DATA_TYPES[selectedModelType].name}
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
    <Btn className="h-12 bg-secondary-2 px-8" onClick={onClick}>
      {children}
    </Btn>
  );
}
