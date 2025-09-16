import DetailView from '@/features/entities/circuit/detail-view';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';

import type { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  params: WorkspaceContext & {
    id: string;
    type: ModelEntitySlugValue;
  };
};

export default async function Detail({ params }: Props) {
  const { id, virtualLabId, projectId } = params;

  const source = await getCircuit({ id, context: { virtualLabId, projectId } });
  return <DetailView params={{ id, virtualLabId, projectId }} payload={source} />;
}
