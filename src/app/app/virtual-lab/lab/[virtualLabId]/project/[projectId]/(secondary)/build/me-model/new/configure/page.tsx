import Configure from '@/page-wrappers/build/me-model/configure';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type Props = ServerSideComponentProp<
  WorkspaceContext,
  {
    s: string; // state
    m: string; // morphology
    e: string; // emodel
  }
>;

export default async function Page({
  params: promisedParams,
  searchParams: promisedSearchParams,
}: Props) {
  const params = await promisedParams;
  const searchParams = await promisedSearchParams;

  return <Configure ctx={params} searchParams={searchParams} />;
}
