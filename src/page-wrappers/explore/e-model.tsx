import { Emodel as entity } from '@/entity-configuration/domain/model/e-model';
import { applyEntityExpansions } from '@/entity-configuration/domain/helpers';
import DetailView from '@/features/entities/e-model/detail-view';

import type { Props as EmodelProps } from '@/features/entities/e-model/detail-view';
import type { WorkspaceContext } from '@/types/common';
import type { IEModel, ICellMorphology, ICellMorphologyExpanded } from '@/api/entitycore/types';
import type { Prettify } from '@/utils/type';

type ExpandType = Prettify<{
  exemplar_morphology: ICellMorphology | ICellMorphologyExpanded;
}>;

type Props = {
  params: WorkspaceContext & {
    id: string;
  };
};

export default async function Detail({ params }: Props) {
  const { id, virtualLabId, projectId } = params;
  const source = await entity.api.query.one!({
    id,
    context: { virtualLabId, projectId },
  });

  let data = {} as ExpandType;
  if (entity.api.expand) {
    data = await applyEntityExpansions<IEModel, ExpandType>(entity, source);
  }

  const payload = { source, ...data } as EmodelProps['payload'];
  return <DetailView params={{ id, virtualLabId, projectId }} payload={payload} />;
}
