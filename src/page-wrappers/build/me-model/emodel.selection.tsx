'use client';

import { usePathname, useRouter } from 'next/navigation';
import { HTMLAttributes, TdHTMLAttributes, useEffect, useId } from 'react';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state-session';
import { checkSelectedEmodelBlackList } from '@/page-wrappers/build/me-model/helpers';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { useAppNotification } from '@/components/notification';
import { Btn } from '@/components/buttons/base/legacy-btn';
import { resolveDataKey } from '@/utils/key-builder';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useBrainRegionHierarchy,
} from '@/features/brain-region-hierarchy/context';
import { useUnwrappedValue } from '@/hooks/hooks';
import { classNames } from '@/util/utils';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  params: WorkspaceContext;
  searchParams: {
    s: string;
  };
};

export default function EmodelSelection({ params, searchParams }: Props) {
  const id = useId();
  const { push: navigate } = useRouter();
  const pathname = usePathname();
  const stateId = searchParams.s;
  const { error: notifyError } = useAppNotification();
  const { setSessionValue, sessionValue } = useBuildMeModelSessionState({
    stateId: stateId || '',
    virtualLabId: params.virtualLabId,
    projectId: params.projectId,
  });

  const dataKey = resolveDataKey({
    projectId: params.projectId,
    section: 'build',
    suffix: id,
  });

  const { updateHierarchyConfig, node } = useBrainRegionHierarchy({ dataKey });
  const brainRegions = useUnwrappedValue(brainRegionBasicCellGroupsRegionsHierarchyAtom);

  useEffect(() => {
    // this is to set the brain region to the root
    // because some many regions do not have emodels (request from Darshan)
    if (node.id !== brainRegions?.root.id!) {
      updateHierarchyConfig(brainRegions?.root!);
    }
  }, [node]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSelect = (selectedRows: IEModel[]) => {
    if (selectedRows.length > 1) {
      notifyError({
        message: 'Multiple e-models selected for ME-Model building. Only one is allowed',
        placement: 'topRight',
      });
      return;
    }
    const selectedEmodel = selectedRows.at(0);
    if (!selectedEmodel) {
      notifyError({
        message: 'No e-model has been selected',
        description: 'Please select an e-model entity to be able to build the me-model',
        placement: 'topRight',
      });
      return;
    }
    if (checkSelectedEmodelBlackList(selectedEmodel)) {
      notifyError({
        message: (
          <span>
            e-model: <strong>{selectedEmodel.name}</strong>
          </span>
        ),
        description:
          'This e-model is currently not compatible with any available morphology. Please choose a different e-model to continue building the ME-model.',
        placement: 'topRight',
      });
      return;
    }
    const emodel = selectedRows.at(0);
    setSessionValue({ ...sessionValue, emodel });

    const upOneLevel = pathname?.split('/').slice(0, -1).join('/');
    const sanitizedSearchParams = new URLSearchParams(searchParams);
    sanitizedSearchParams.set('e', emodel!.id);
    const newHref = sanitizedSearchParams
      ? `${upOneLevel}?${sanitizedSearchParams.toString()}`
      : (upOneLevel ?? '');

    navigate(newHref);
  };

  const onCellClick = (_basePath: string, record: IEModel) => {
    resolveExploreDetailsPageUrl({
      ctx: { virtualLabId: params.virtualLabId, projectId: params.projectId },
      dataType: DataType.CircuitEModel,
      entityId: record.id,
    });
  };

  if (!stateId) {
    navigate('../');
    return;
  }

  return (
    <div className="h-full px-10" id="explore-table-container-for-observable">
      <ExploreSectionListingView<IEModel>
        dataKey={dataKey}
        containerClass="h-full bg-white"
        dataType={DataType.CircuitEModel}
        dataScope={ExploreDataScope.BuildSelectedBrainRegion}
        onCellClick={onCellClick}
        selectionType="radio"
        virtualLabInfo={{ virtualLabId: params.virtualLabId, projectId: params.projectId }}
        renderButton={({ selectedRows }) => (
          <Btn
            className="fit-content bg-primary-8 sticky bottom-0 ml-auto w-fit"
            onClick={() => onSelect(selectedRows)}
          >
            Select e-model
          </Btn>
        )}
        onRow={(row) => {
          if (checkSelectedEmodelBlackList(row))
            // this new line in the attribute is required to be displayed in two lines
            return {
              'black-listed': `This e-model cannot be combined 
              with any morphology for now.
              `,
            } as HTMLAttributes<any> & TdHTMLAttributes<any>;
          return {};
        }}
        rowClassName={(row: IEModel) => {
          return checkSelectedEmodelBlackList(row)
            ? classNames(
                'bg-gray-200 [&_td]:bg-gray-200! hover:[bg-gray-200] [&:hover_td]:bg-gray-200',
                '[&_.ant-radio-input]:pointer-events-none [&_.ant-radio-wrapper]:pointer-events-none [&_.ant-radio]:pointer-events-none [&_.ant-radio-input]:pointer-events-none',
                '[&_.ant-radio-input]:cursor-not-allowed [&_.ant-radio-wrapper]:cursor-not-allowed',
                '[&_.ant-table-cell]:cursor-not-allowed',
                `
                  [tr:has(.ant-radio-wrapper)]:relative!
                  [tr:has(.ant-radio-wrapper)]:hover:after:content-[attr(black-listed)]!
                  [tr:has(.ant-radio-wrapper)]:hover:after:absolute
                  [tr:has(.ant-radio-wrapper)]:hover:after:bg-yellow-100
                  [tr:has(.ant-radio-wrapper)]:hover:after:backdrop-blur-xl
                  [tr:has(.ant-radio-wrapper)]:hover:after:border
                  [tr:has(.ant-radio-wrapper)]:hover:after:border-yellow-100/20
                  [tr:has(.ant-radio-wrapper)]:hover:after:shadow-lg
                  [tr:has(.ant-radio-wrapper)]:hover:after:text-primary-8
                  [tr:has(.ant-radio-wrapper)]:hover:after:text-sm
                  [tr:has(.ant-radio-wrapper)]:hover:after:px-2
                  [tr:has(.ant-radio-wrapper)]:hover:after:py-1
                  [tr:has(.ant-radio-wrapper)]:hover:after:rounded
                  [tr:has(.ant-radio-wrapper)]:hover:after:whitespace-pre-line
                  [tr:has(.ant-radio-wrapper)]:hover:after:z-50
                  [tr:has(.ant-radio-wrapper)]:hover:after:top-[10px]
                  [tr:has(.ant-radio-wrapper)]:hover:after:left-[10px]
                `
              )
            : '';
        }}
      />
    </div>
  );
}
