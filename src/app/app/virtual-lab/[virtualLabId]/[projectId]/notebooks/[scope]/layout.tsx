import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
// import { useNextStep } from 'nextstepjs';
// import find from 'es-toolkit/compat/find';

import { ServerSideLayoutProp, WorkspaceContext } from '@/types/common';
import { NotebooksLayout } from '@/ui/layouts/notebooks-layout';

// import { notebookTour } from '@/ui/segments/app-setup/discover-app';
// import { LeftMenu } from '@/ui/segments/notebooks/left-nav-menu';
// import { NotebookHeader } from '@/ui/segments/notebooks/header';
// import { useLocalStorage } from '@/hooks/use-local-storage';
// import { AUTO_ONBOARDING_TOURS } from '@/constants';

export default async function Page({
  children,
  params: promisedParams,
}: ServerSideLayoutProp<WorkspaceContext & { scope: string }> & {
  children: ReactNode;
}) {
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

  const params = await promisedParams;
  const { scope } = params;
  if (!['public', 'private'].includes(scope)) notFound();

  return <NotebooksLayout active={scope as 'public' | 'private'}>{children}</NotebooksLayout>;
}
