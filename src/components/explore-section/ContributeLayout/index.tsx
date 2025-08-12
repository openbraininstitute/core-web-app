// File: app/virtual-lab/explore/interactive/add/layout.tsx (or wherever your 'add' route lives)

'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import BackToInteractiveExplorationBtn from '@/components/explore-section/BackToInteractiveExplorationBtn';

export default function ContributeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Determine the href for the back button.
  // Goal: If current is /virtual-lab/explore/interactive/add/experimental/morphology
  // It should go back to /virtual-lab/explore/interactive
  const splittedPathname = pathname.split('/');
  let interactivePageHref = '/'; // Default fallback

  const addIndex = splittedPathname.indexOf('add');

  if (addIndex > -1) {
    // If 'add' is found, take all segments up to (but not including) 'add'
    interactivePageHref = splittedPathname.slice(0, addIndex).join('/');
  } else {
    // Fallback: If 'add' is not in the path (unexpected for this layout),
    // go back one level from the current path.
    interactivePageHref = splittedPathname.slice(0, splittedPathname.length - 1).join('/');
  }

  // Ensure the path starts with a '/' if it's not empty (e.g., if it's just 'virtual-lab/explore/interactive')
  if (interactivePageHref === '') {
    interactivePageHref = '/';
  } else if (!interactivePageHref.startsWith('/')) {
    interactivePageHref = '/' + interactivePageHref;
  }

  return (
    <div className="bg-primary-9 flex h-screen w-full overflow-x-auto" id="contribute-layout">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <BackToInteractiveExplorationBtn href={interactivePageHref} />

        <div className="bg-primary-9 grow text-white">{children}</div>
      </ErrorBoundary>
    </div>
  );
}
