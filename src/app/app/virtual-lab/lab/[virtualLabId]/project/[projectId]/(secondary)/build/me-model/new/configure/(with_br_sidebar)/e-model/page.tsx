import EmodelSelectionPage from '@/pages/build/me-model/emodel.selection';
import type { WorkspaceContext } from '@/types/common';

type Params = {
  params: Promise<WorkspaceContext>;
};

export default async function Page({ params: urlParams }: Params) {
  const params = await urlParams;
  return <EmodelSelectionPage params={params} />;
}
