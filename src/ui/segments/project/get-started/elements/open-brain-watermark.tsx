'use client';

import { useAtomValue } from 'jotai';

import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';

const HIDE_FOR: ReadonlyArray<string> = ['pricing', 'news'];

export function OpenBrainWatermark() {
  const view = useAtomValue(leftPaneViewAtom);
  if (view && HIDE_FOR.includes(view)) return null;

  return (
    <div
      aria-hidden
      className="text-primary-9 pointer-events-none absolute right-12 bottom-16 text-right font-serif text-5xl leading-none select-none"
    >
      Open Brain
      <br />
      Institute
    </div>
  );
}

export default OpenBrainWatermark;
