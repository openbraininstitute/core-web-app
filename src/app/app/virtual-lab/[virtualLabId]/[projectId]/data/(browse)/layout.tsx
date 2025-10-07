'use client';

import { use, useLayoutEffect } from 'react';
import { useNextStep } from 'nextstepjs';
import find from 'es-toolkit/compat/find';

import type { ReactNode } from 'react';

import { DefaultContent as ExploreDefaultContent } from '@/ui/segments/explore/default-content';
import { DataInnerLayout } from '@/ui/layouts/explore-inner-layout';
import { dataTour } from '@/ui/segments/app-setup/discover-app';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { DataHeader } from '@/ui/segments/explore/header';
import { DataLayout } from '@/ui/layouts/explore-layout';
import { resolveDataKey } from '@/utils/key-builder';
import { AUTO_ONBOARDING_TOURS } from '@/constants';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function Page({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  const { projectId } = use(params);
  const dataKey = resolveDataKey({ projectId, section: 'explore' });

  const { startNextStep } = useNextStep();
  const [onboardingState] = useLocalStorage<{
    tours: Array<{
      tour: string | null;
      done: boolean | null;
      date: number | null;
      step: number | null;
    }>;
  }>(AUTO_ONBOARDING_TOURS, {
    tours: [],
  });

  useLayoutEffect(() => {
    const tour = find(onboardingState.tours, { tour: dataTour });

    if (!tour || !tour.done) {
      startNextStep(dataTour);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DataLayout>
      <DataHeader />
      <DataInnerLayout>
        <ExploreDefaultContent dataKey={dataKey}>{children}</ExploreDefaultContent>
      </DataInnerLayout>
    </DataLayout>
  );
}
