'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId } from 'react';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state-session';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { Btn } from '@/components/buttons/base/legacy-btn';
import { resolveDataKey } from '@/utils/key-builder';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  useBrainRegionHierarchy,
} from '@/features/brain-region-hierarchy/context';
import { useUnwrappedValue } from '@/hooks/hooks';

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
    // because some many regions do not have emodels
    if (node.id !== brainRegions?.root.id!) {
      updateHierarchyConfig(brainRegions?.root!);
    }
  }, [node]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSelect = (selectedRows: IEModel[]) => {
    if (selectedRows.length > 1) {
      throw new Error('Multiple e-models selected for ME-Model building. Only one is allowed');
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
      />
    </div>
  );
}
