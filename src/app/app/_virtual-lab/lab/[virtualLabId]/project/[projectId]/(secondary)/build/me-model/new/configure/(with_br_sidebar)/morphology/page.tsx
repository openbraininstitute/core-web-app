import MorphologySelectionPage from '@/page-wrappers/build/me-model/morphology.selection';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  params: promisedParams,
  searchParams: promisedSearchParams,
}: ServerSideComponentProp<WorkspaceContext, { s: string }>) {
  const params = await promisedParams;
  const searchParams = await promisedSearchParams;

  return <MorphologySelectionPage params={params} searchParams={searchParams} />;
}
