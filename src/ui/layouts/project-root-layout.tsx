'use client';

import { useLayoutEffect, type ReactNode } from 'react';
import { useNextStep } from 'nextstepjs';

import { defaultWorkspaceTour } from '@/ui/segments/app-setup/discover-app';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AUTO_ONBOARDING_DONE } from '@/constants';

type Props = {
  children: ReactNode;
};

export function ProjectRootLayout({ children }: Props) {
  const { startNextStep } = useNextStep();
  const [onboardingState] = useLocalStorage<{
    date: number | null;
    done: boolean;
  }>(AUTO_ONBOARDING_DONE, {
    date: null,
    done: false,
  });

  useLayoutEffect(() => {
    if (!onboardingState.done) {
      startNextStep(defaultWorkspaceTour);
    }
  }, [onboardingState.done, startNextStep]);

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
