import { DiscoverList } from '@/ui/segments/project/get-started/sections/discover';
import { MainVideo } from '@/ui/segments/project/get-started/sections/main-video';
import { MainCards } from '@/ui/segments/project/get-started/sections/quick-access';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page(props: ServerSideComponentProp<WorkspaceContext, null>) {
  const context = await props.params;
  return (
    <div className="w-full flex flex-col pr-2">
      <MainCards context={context} />
      <MainVideo />
      <DiscoverList />
    </div>
  );
}
