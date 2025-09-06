'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useId } from 'react';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state-session';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { Btn } from '@/components/buttons/base/legacy-btn';
import { resolveDataKey } from '@/utils/key-builder';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  params: WorkspaceContext;
  searchParams: { s: string };
};

export default function MorphologySelection({ params, searchParams }: Props) {
  const id = useId();

  const pathname = usePathname();
  const { push: navigate } = useRouter();

  const { virtualLabId, projectId } = params;
  const stateId = searchParams.s;

  const { setSessionValue, sessionValue } = useBuildMeModelSessionState({
    stateId,
    virtualLabId,
    projectId,
  });

  if (!stateId) {
    navigate('../');
    return;
  }

  const onSelect = (selectedRows: Array<ICellMorphology>) => {
    if (selectedRows.length > 1) {
      throw new Error('Multiple morphologies selected for ME-Model building. Only one is allowed');
    }

    const morphology = selectedRows.at(0);
    setSessionValue({ ...sessionValue, mmodel: morphology, brainRegion: morphology?.brain_region });

    const upOneLevel = pathname?.split('/').slice(0, -1).join('/');
    const urlSearchParams = new URLSearchParams(searchParams);
    urlSearchParams.set('m', morphology!.id);
    const newHref = urlSearchParams
      ? `${upOneLevel}?${urlSearchParams.toString()}`
      : (upOneLevel ?? '');

    navigate(newHref);
  };

  const onCellClick = (_basePath: string, record: ICellMorphology) => {
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId: params.virtualLabId, projectId: params.projectId },
        dataType: DataType.ExperimentalNeuronMorphology,
        entityId: record.id,
      })
    );
  };
  const dataKey = resolveDataKey({ projectId, section: 'build', suffix: id });
  return (
    <div className="h-full" id="explore-table-container-for-observable">
      <ExploreSectionListingView<ICellMorphology>
        containerClass="h-full bg-white"
        dataKey={dataKey}
        dataType={DataType.ExperimentalNeuronMorphology}
        dataScope={ExploreDataScope.BuildSelectedBrainRegion}
        onCellClick={onCellClick}
        virtualLabInfo={{ virtualLabId: params.virtualLabId, projectId: params.projectId }}
        selectionType="radio"
        renderButton={({ selectedRows }) => (
          <Btn
            className="fit-content bg-primary-8 sticky bottom-0 ml-auto w-fit"
            onClick={() => onSelect(selectedRows)}
          >
            Select m-model
          </Btn>
        )}
      />
    </div>
  );
}
