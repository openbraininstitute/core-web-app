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

export default async function Page(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  return (
    <Configure
      {...{
        params,
        searchParams,
      }}
    />
  );
}
