import ListingView from '@/components/explore-section/entity-core-circuits/list-view';
import { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';
import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function EntityCoreCircuits({
  params: promisedParams,
}: ServerSideComponentProp<
  WorkspaceContext & {
    type: ModelEntitySlugValue;
  },
  null
>) {
  const params = await promisedParams;

  return <ListingView virtualLabId={params.virtualLabId} projectId={params.projectId} />;
}
