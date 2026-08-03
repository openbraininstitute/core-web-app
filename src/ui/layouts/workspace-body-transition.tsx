'use client';

import { usePathname } from 'next/navigation';
import { ViewTransition } from 'react';

import { getActiveSection } from '@/utils/get-section';
import { WORKSPACE_NAV_BACK, WORKSPACE_NAV_FORWARD } from '@/utils/workspace-view-transition';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/**
 * Scrollable page area of a workspace. The <ViewTransition> is keyed by the
 * active section so that switching between the top-menu tabs remounts it,
 * sliding the old section out and the new one in. The direction types are
 * dispatched by the top-menu tab links; the classes are styled in globals.css.
 * Navigations inside a section keep the same key and animate nothing
 * (update="none"), which also keeps late streamed-in content from re-running
 * the slide.
 */
export function WorkspaceBodyTransition({ children }: Props) {
  const pathname = usePathname();

  return (
    <ViewTransition
      key={getActiveSection(pathname) ?? ''}
      default="none"
      update="none"
      enter={{
        [WORKSPACE_NAV_FORWARD]: 'workspace-slide-enter-forward',
        [WORKSPACE_NAV_BACK]: 'workspace-slide-enter-back',
        default: 'none',
      }}
      exit={{
        [WORKSPACE_NAV_FORWARD]: 'workspace-slide-exit-forward',
        [WORKSPACE_NAV_BACK]: 'workspace-slide-exit-back',
        default: 'none',
      }}
    >
      <div
        id="workspace-body"
        className="secondary-scrollbar w-full overflow-x-hidden overflow-y-auto pb-3 [grid-area:main]"
      >
        {children}
      </div>
    </ViewTransition>
  );
}
