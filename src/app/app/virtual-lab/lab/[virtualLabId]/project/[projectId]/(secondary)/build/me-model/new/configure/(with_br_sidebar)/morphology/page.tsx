import MorphologySelectionPage from '@/page-wrappers/build/me-model/morphology.selection';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page(
  props: ServerSideComponentProp<WorkspaceContext, { s: string }>
) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  return (
    <MorphologySelectionPage
      {...{
        params,
        searchParams,
      }}
    />
  );
}
