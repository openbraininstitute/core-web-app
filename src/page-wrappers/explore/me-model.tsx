import { MEmodel as entity } from '@/entity-configuration/domain/model/me-model';
import DetailView from '@/features/entities/me-model/detail-view';

import type { Props as MEmodelProps } from '@/features/entities/me-model/detail-view';
import type { WorkspaceContext } from '@/types/common';

export type Props = {
  params: WorkspaceContext & {
    id: string;
  };
};

export default async function Detail(props: Props) {
  const { id, virtualLabId, projectId } = props.params;
  const source = await entity.api.query.one!({
    id: id,
    context: { virtualLabId, projectId },
  });

  const payload = { source } as MEmodelProps['payload'];
  return <DetailView params={{ id, virtualLabId, projectId }} payload={payload} />;
}
