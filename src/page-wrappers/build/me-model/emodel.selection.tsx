'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useId } from 'react';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state-session';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { Btn } from '@/components/buttons/base/legacy-btn';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { WorkspaceContext } from '@/types/common';
import { resolveDataKey } from '@/utils/key-builder';

type Props = {
  params: WorkspaceContext;
  searchParams: {
    s: string;
  };
};

export default function EmodelSelection({ params, searchParams }: Props) {
  const { push: navigate } = useRouter();
  const pathname = usePathname();

  const stateId = searchParams.s;

  const { setSessionValue, sessionValue } = useBuildMeModelSessionState({
    stateId: stateId || '',
    virtualLabId: params.virtualLabId,
    projectId: params.projectId,
  });

  if (!stateId) {
    navigate('../');
    return;
  }

  const onSelect = (selectedRows: IEModel[]) => {
    if (selectedRows.length > 1) {
      throw new Error('Multiple e-models selected for ME-Model building. Only one is allowed');
    }
    const emodel = selectedRows.at(0);
    setSessionValue({ ...sessionValue, emodel });

    const upOneLevel = pathname?.split('/').slice(0, -1).join('/');
    const _params = new URLSearchParams(searchParams);
    _params.set('e', emodel!.id);
    const newHref = _params ? `${upOneLevel}?${_params.toString()}` : (upOneLevel ?? '');

    navigate(newHref);
  };

  const onCellClick = (_basePath: string, record: IEModel) => {
    resolveExploreDetailsPageUrl({
      ctx: { virtualLabId: params.virtualLabId, projectId: params.projectId },
      dataType: DataType.CircuitEModel,
      entityId: record.id,
    });
  };
  const dataKey = resolveDataKey({
    projectId: params.projectId,
    section: 'build',
    suffix: useId(),
  });

  return (
    <div className="h-full px-10" id="explore-table-container-for-observable">
      <ExploreSectionListingView<IEModel>
        dataKey={dataKey}
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
