'use client';

import type { ReactNode } from 'react';
// import { useNextStep } from 'nextstepjs';
// import find from 'es-toolkit/compat/find';

import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { NotebookInnerLayout } from '@/ui/layouts/notebook-inner-layout';
import { NotebooksLayout } from '@/ui/layouts/notebooks-layout';
// import { notebookTour } from '@/ui/segments/app-setup/discover-app';
// import { LeftMenu } from '@/ui/segments/notebooks/left-nav-menu';
// import { NotebookHeader } from '@/ui/segments/notebooks/header';
// import { useLocalStorage } from '@/hooks/use-local-storage';
// import { AUTO_ONBOARDING_TOURS } from '@/constants';

export default function Page({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  // const { startNextStep } = useNextStep();
  // const [onboardingState] = useLocalStorage<{
  //   tours: Array<{
  //     tour: string | null;
  //     done: boolean | null;
  //     date: number | null;
  //     step: number | null;
  //   }>;
  // }>(AUTO_ONBOARDING_TOURS, {
  //   tours: [],
  // });

  // useLayoutEffect(() => {
  //   const tour = find(onboardingState.tours, { tour: notebookTour });

  //   if (!tour || !tour.done) {
  //     startNextStep(notebookTour);
  //   }
  // }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NotebooksLayout>
      {/* <NotebookHeader /> */}
      <NotebookInnerLayout>
        {/* <div id="notebook-left-menu" data-testid="notebook-left-menu" className="w-full">
          <LeftMenu className="w-full" />
        </div> */}
        <div id="notebook-main-content" className="secondary-scrollbar w-full overflow-y-auto">
          {children}
        </div>
      </NotebookInnerLayout>
    </NotebooksLayout>
  );
}
