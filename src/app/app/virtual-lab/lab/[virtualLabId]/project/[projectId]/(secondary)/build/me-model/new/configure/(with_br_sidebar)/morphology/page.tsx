import MorphologySelectionPage from '@/pages/build/me-model/morphology.selection';
import type { WorkspaceContext } from '@/types/common';

type Params = {
  params: Promise<WorkspaceContext>;
};

export default async function Page({ params: urlParams }: Params) {
  const params = await urlParams;
  return <MorphologySelectionPage params={params} />;
}
