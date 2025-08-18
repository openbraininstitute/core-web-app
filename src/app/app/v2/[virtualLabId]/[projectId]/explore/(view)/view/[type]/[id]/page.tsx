import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict>; id: string },
  null
>) {
  const { virtualLabId, projectId, type, id } = await params;

  return (
    <div>
      <pre>{JSON.stringify({ virtualLabId, projectId, type, id }, null, 2)}</pre>
    </div>
  );
}
