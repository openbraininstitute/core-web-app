'use client';

import EModelView from '@/components/build-section/cell-model-assignment/e-model/EModelView';

import type { IReconstructionMorphology, IEModel } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  params: WorkspaceContext & { id: string };
  payload: {
    source: IEModel;
    exemplar_morphology: IReconstructionMorphology;
  };
};

export default function Configuration({ params, payload }: Props) {
  return (
    <div className="flex flex-col gap-6 pt-5">
      <EModelView showTitle={false} params={params} payload={payload} />
    </div>
  );
}
