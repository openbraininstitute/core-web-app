'use client';

import EModelView from '@/features/entities/e-model/detail-view/wrapper';

import type { ICellMorphology, IEModel } from '@/api/entitycore/types';

type Props = {
  payload: {
    source: IEModel;
    exemplar_morphology: ICellMorphology;
  };
};

export default function Configuration({ payload }: Props) {
  return (
    <div className="flex flex-col gap-6 pt-5">
      <EModelView payload={payload} />
    </div>
  );
}
