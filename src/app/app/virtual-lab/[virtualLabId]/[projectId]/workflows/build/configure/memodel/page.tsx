import { Header } from '@/ui/segments/workflows/build/memodel/header';
import { Menu } from '@/ui/segments/workflows/build/memodel/menu';
import { Content } from '@/ui/segments/workflows/build/memodel';

import type { BuildStepKeys } from '@/ui/segments/workflows/build/memodel/helpers';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { id: string },
  { step: BuildStepKeys; sessionId: string }
>) {
  let { sessionId } = await searchParams;
  if (!sessionId) sessionId = crypto.randomUUID();

  return (
    <div className="border-neutral-2 mx-2 flex h-full w-[calc(100%-10px)] flex-col rounded-2xl border p-4">
      <div className="mb-2 w-full flex-shrink-0">
        <Header />
      </div>
      <div className='grid min-h-0 w-full flex-1 grid-cols-[24rem_1fr] gap-4 [grid-template-areas:"menu_content"]'>
        <div
          id="menu"
          className="flex h-full w-full flex-col gap-2 overflow-y-auto [grid-area:menu]"
        >
          <Menu sessionId={sessionId} />
        </div>
        <div className="h-full overflow-hidden [grid-area:content]">
          <Content sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
