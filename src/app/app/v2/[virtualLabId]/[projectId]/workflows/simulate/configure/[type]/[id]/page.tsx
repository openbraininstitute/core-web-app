import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

import type { KebabCase } from '@/utils/type';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict>; id: string },
  null
>) {
  const { type, id } = await params;
  return (
    <div>
      Configuration of {type} of {id}{' '}
    </div>
  );
}
