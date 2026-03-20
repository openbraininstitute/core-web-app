'use client';

import React, { use } from 'react';

import { Content } from '@/ui/segments/workflows/build/single-neuron-synaptome';
import { Menu } from '@/ui/segments/workflows/build/single-neuron-synaptome/menu';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { BuildStepKeys } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';

export default function Page({
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { id: string },
  { step: BuildStepKeys; sessionId: string }
>) {
  const sessionId = useSessionId(searchParams);

  return (
    <div className="h-full mx-2 flex flex-col max-h-[calc(100vh-6rem)] w-[calc(100%-10px)] overflow-hidden">
      <div className="border-neutral-2 flex h-full w-[calc(100%-10px)] flex-col rounded-2xl border p-4">
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

/**
 * If there is no sessionId in the parameters,
 * we create a random one that stay stable between re-renders.
 */
function useSessionId(
  searchParams: Promise<{
    step: BuildStepKeys;
    sessionId: string;
  }>
) {
  const refSessionId = React.useRef<string | null>(null);
  if (!refSessionId.current) refSessionId.current = crypto.randomUUID();
  const { sessionId } = use(searchParams);
  return sessionId ?? refSessionId.current;
}
