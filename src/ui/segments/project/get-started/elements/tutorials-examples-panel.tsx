'use client';

import { useAtomValue } from 'jotai';

import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';

import type { ReactNode } from 'react';

export function TutorialsExamplesPanel({ children }: { children: ReactNode }) {
  const view = useAtomValue(leftPaneViewAtom);
  if (view !== 'tutorials') return null;
  return <>{children}</>;
}

export default TutorialsExamplesPanel;
