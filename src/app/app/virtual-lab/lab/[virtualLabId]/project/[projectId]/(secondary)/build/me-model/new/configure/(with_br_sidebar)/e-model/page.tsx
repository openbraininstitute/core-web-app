import EmodelSelectionPage from '@/page-wrappers/build/me-model/emodel.selection';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page(
  props: ServerSideComponentProp<WorkspaceContext, { s: string }>
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  return (
    <EmodelSelectionPage
      {...{
        params,
        searchParams,
      }}
    />
  );
}
