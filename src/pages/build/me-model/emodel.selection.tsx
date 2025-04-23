'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId, use } from 'react';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state.session';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { Btn } from '@/components/buttons/base/legacy-btn';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { WorkspaceContext } from '@/types/common';

type Params = {
  params: WorkspaceContext;
};

export default function Page({ params }: Params) {
  const searchParams = useSearchParams();
  const { push: navigate } = useRouter();
  const pathname = usePathname();

  const { virtualLabId, projectId } = params;
  const stateId = searchParams?.get('s');

  const { setSessionValue, sessionValue } = useBuildMeModelSessionState({
    stateId: stateId || '',
    virtualLabId,
    projectId,
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
    setSessionValue({
      ...sessionValue,
      emodel,
    });

    const upOneLevel = pathname?.split('/').slice(0, -1).join('/');

    const _params = new URLSearchParams(searchParams?.toString());
    _params.set('e', emodel!.id);
    const newHref = _params ? `${upOneLevel}?${_params.toString()}` : (upOneLevel ?? '');

    navigate(newHref);
  };

  const onCellClick = (_basePath: string, record: IEModel) => {
    resolveExploreDetailsPageUrl({
      ctx: { virtualLabId, projectId },
      dataType: DataType.CircuitEModel,
      entityId: record.id,
    });
  };

  return (
    <div className="h-full px-10" id="explore-table-container-for-observable">
      <ExploreSectionListingView<IEModel>
        dataKey={useId()}
        dataType={DataType.CircuitEModel}
        dataScope={ExploreDataScope.BuildSelectedBrainRegion}
        onCellClick={onCellClick}
        selectionType="radio"
        virtualLabInfo={{ virtualLabId, projectId }}
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
