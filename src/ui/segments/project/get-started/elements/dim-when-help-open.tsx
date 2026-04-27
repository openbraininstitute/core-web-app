'use client';

import { useAtom, useSetAtom } from 'jotai';

import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';
import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';

import type { ReactNode } from 'react';

export function DimWhenHelpOpen({ children }: { children: ReactNode }) {
  const [view, setView] = useAtom(leftPaneViewAtom);
  const setPreview = useSetAtom(dataPreviewAtom);
  const isDimmed = view !== null;

  return (
    <div className="relative">
      {children}
      <button
        type="button"
        aria-label="Close help"
        onClick={() => {
          setView(null);
          setPreview(null);
        }}
        tabIndex={isDimmed ? 0 : -1}
        className={`absolute inset-0 cursor-pointer rounded-lg bg-white/45 transition-opacity duration-200 ${
          isDimmed ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
    </div>
  );
}

export default DimWhenHelpOpen;
