import EmodelSelectionPage from '@/page-wrappers/build/me-model/emodel.selection';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  params: promisedParams,
  searchParams: promisedSearchParams,
}: ServerSideComponentProp<WorkspaceContext, { s: string }>) {
  const params = await promisedParams;
  const searchParams = await promisedSearchParams;
  return (
    <EmodelSelectionPage
      {...{
        params,
        searchParams,
      }}
    />
  );
}
