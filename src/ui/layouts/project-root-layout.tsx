'use client';

import { useLayoutEffect, type ReactNode } from 'react';
import { useNextStep } from 'nextstepjs';
import find from 'lodash/find';

import { projectTour } from '@/ui/segments/app-setup/discover-app';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AUTO_ONBOARDING_TOURS } from '@/constants';

type Props = {
  children: ReactNode;
};

export function ProjectRootLayout({ children }: Props) {
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
    const tour = find(onboardingState.tours, { tour: projectTour });

    if (!tour || !tour.done) {
      startNextStep(projectTour);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      id="project-root-layout"
      className="bg-background grid h-screen w-full grid-cols-[1fr_minmax(3rem,auto)] grid-rows-[5rem_1fr] gap-2 overflow-hidden [grid-template-areas:'header_header''main_ai']"
    >
      {children}
    </div>
  );
}

export default ProjectRootLayout;
