'use client';

import { use } from 'react';

import { Content } from '@/ui/segments/workflows/build/single-neuron-synaptome';
import { Header } from '@/ui/segments/workflows/build/single-neuron-synaptome/header';
import { Menu } from '@/ui/segments/workflows/build/single-neuron-synaptome/menu';
import { WorkflowScopeTabs } from '@/ui/segments/workflows/elements/scope-selector';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { BuildStepKeys } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';

export default function Page({
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { id: string },
  { step: BuildStepKeys; sessionId: string }
>) {
  let { sessionId } = use(searchParams);
  if (!sessionId) sessionId = crypto.randomUUID();

  return (
    <div className="h-full mx-2 flex flex-col max-h-[calc(100vh-6rem)] w-[calc(100%-10px)] overflow-hidden">
      <div className="border-neutral-2 flex h-full w-[calc(100%-10px)] flex-col rounded-2xl border p-4">
        <div className="mb-2 w-full shrink-0">
          <Header />
        </div>
        <div className='grid min-h-0 w-full flex-1 grid-cols-[24rem_1fr] gap-4 [grid-template-areas:"menu_content"]'>
          <div
            id="menu"
            className="secondary-scrollbar flex h-full w-full flex-col gap-2 px-2 [grid-area:menu]"
          >
            <Menu sessionId={sessionId} />
          </div>
          <div className="h-full overflow-hidden [grid-area:content]">
            <Content sessionId={sessionId} />
          </div>
        </div>
      </div>
    </div>
  );
}
