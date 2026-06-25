'use client';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import {
  NextStepProvider as OnboardingProvider,
  NextStep as OnboardingSteps,
  useNextStep,
} from 'nextstepjs';
import { type ReactNode, useLayoutEffect } from 'react';

import { useOnboardingStatus, useUpdateOnboardingStatus } from '@/hooks/use-onboarding';
import { Button } from '@/ui/molecules/button';
import { Card } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

import type { CardComponentProps, Tour } from 'nextstepjs';
import type { TOnboardingFeature } from '@/api/virtual-lab-svc/queries/types';

const TourAction = {
  Skip: 'skip',
  Complete: 'complete',
} as const;
type TTourAction = (typeof TourAction)[keyof typeof TourAction];

function QuitOnboardingOnClickOutside({
  onSkipOrComplete,
}: {
  onSkipOrComplete: (tour: string | null, step?: number, action?: TTourAction) => void;
}) {
  const { isNextStepVisible, closeNextStep, currentTour } = useNextStep();

  useLayoutEffect(() => {
    if (!isNextStepVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const onboardingCard = document.getElementById('onboarding-card');

      // if click is outside the card, close the tour
      if (onboardingCard && !onboardingCard.contains(target)) {
        onSkipOrComplete(currentTour, undefined, TourAction.Skip);
        closeNextStep();
      }
    };

    // add listener with a small delay to avoid immediate triggering
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNextStepVisible, currentTour, onSkipOrComplete, closeNextStep]);

  return null;
}

export function AppOnboardingProvider({ children }: { children: ReactNode }) {
  const { mutate: updateBackend } = useUpdateOnboardingStatus();

  const onSkipOrComplete = (tour: string | null, step?: number, action?: TTourAction) => {
    if (!tour) return;
    const isComplete =
      (OnboardingDiscoverSteps.find((o) => o.tour === tour)?.steps.length ?? 0) - 1 === step;
    updateBackend({
      tour: tour as TOnboardingFeature,
      current_step: step,
      completed: isComplete || action === TourAction.Complete,
      dismissed: action === TourAction.Skip,
    });
  };

  const onStepChange = (step: number, tour: string | null) => {
    if (!tour) return;

    updateBackend({
      tour: tour as TOnboardingFeature,
      current_step: step,
    });
  };

  return (
    <OnboardingProvider>
      <OnboardingSteps
        showNextStep
        disableConsoleLogs
        steps={OnboardingDiscoverSteps}
        shadowRgb="63, 92, 139"
        shadowOpacity="0.8"
        cardComponent={OnboardingDiscoverCard}
        cardTransition={{
          duration: 0.2,
          type: 'tween',
          ease: 'easeIn',
          stiffness: 100,
          damping: 10,
        }}
        onSkip={(step, tour) => onSkipOrComplete(tour, step, TourAction.Skip)}
        onComplete={(tour) => onSkipOrComplete(tour, undefined, TourAction.Complete)}
        onStepChange={onStepChange}
      >
        {children}
        <QuitOnboardingOnClickOutside onSkipOrComplete={onSkipOrComplete} />
      </OnboardingSteps>
    </OnboardingProvider>
  );
}

export function OnboardingDiscoverCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
  skipTour,
}: CardComponentProps) {
  return (
    <Card
      id="onboarding-card"
      data-testid="onboarding-card"
      className="w-max max-w-xs gap-0 rounded-3xl border-0 bg-white p-0"
    >
      <div className="flex w-full items-start justify-between px-6 pt-4 pb-0">
        <h1 className="text-primary-9 mb-2 text-lg font-bold">{step?.title}</h1>
        <div className="flex w-max min-w-max flex-nowrap items-center justify-center gap-1">
          <LeftOutlined
            onClick={() => {
              if (currentStep + 1 <= totalSteps && currentStep > 0) prevStep();
            }}
            className={cn('text-primary-8 text-sm', { 'text-neutral-3': currentStep === 0 })}
          />
          <span className="w-max min-w-max">
            {currentStep + 1} of {totalSteps}
          </span>
          <RightOutlined
            onClick={() => {
              if (currentStep + 1 < totalSteps) nextStep();
            }}
            className={cn('text-primary-8 text-sm', {
              'text-neutral-3': currentStep + 1 === totalSteps,
            })}
          />
        </div>
      </div>
      <p className="px-6 py-2">{step.content}</p>
      <div className="flex w-full items-center justify-end gap-3 px-6 pt-2 pb-4">
        {currentStep + 1 < totalSteps && (
          <Button variant="ghost" onClick={skipTour}>
            Skip
          </Button>
        )}
        {currentStep + 1 !== totalSteps && (
          <Button rounded onClick={nextStep}>
            Next tip
          </Button>
        )}
        {currentStep + 1 === totalSteps && (
          <Button rounded onClick={skipTour}>
            Get started
          </Button>
        )}
      </div>
      <span
        className={cn(
          'flex items-center justify-center text-white',
          { '[&_svg]:left-[20px]!': step.side === 'bottom-left' },
          { '[&_svg]:right-[20px]!': step.side === 'bottom-right' },
          {
            '[&_svg]:top-1/2! [&_svg]:-right-[20px]!':
              step.side === 'left' || step.side === 'right',
          },
          {
            '-top-[19px]': step.side?.startsWith('top'),
          }
        )}
      >
        {arrow}
      </span>
    </Card>
  );
}

// NOTE: this should match the BE naming
// in virtual-lab-service this values are an enum
export const defaultWorkspaceTour = 'workspace';
export const projectTour = `${defaultWorkspaceTour}-project`;
export const dataTour = `${defaultWorkspaceTour}-data`;
export const workflowTour = `${defaultWorkspaceTour}-workflow`;
export const notebookTour = `${defaultWorkspaceTour}-notebook`;

export const OnboardingDiscoverSteps: Tour[] = [
  {
    tour: projectTour,
    steps: [
      {
        icon: null,
        title: 'Labs, projects + user account',
        content: (
          <>
            Manage your virtual labs, projects, user account, credits and subscription. Invite
            people to your lab and projects.
          </>
        ),
        selector: '#workspace-switcher',
        side: 'bottom-left',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Project credits',
        content: <>View your remaining project credits and transfer credits between projects.</>,
        selector: '#workspace-project-credits',
        side: 'bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Project home',
        content: (
          <>View your project’s latest activities, manage project credits and invite new members.</>
        ),
        selector: '#workspace-home',
        side: 'bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Data',
        content: (
          <>
            Explore an extensive collection of experimental and model data, made public by the
            community or OBI. All data is standardized and curated, so you can instantly start
            answering scientific questions with Workflows and example Notebooks.
          </>
        ),
        selector: '#workspace-explore-data',
        side: 'bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Workflows',
        content: (
          <>
            Launch standardized workflows to build models, launch experiments and run analysis.
            Workflows enable parameter scans over any variable, and are designed for fast iterative
            science.
          </>
        ),
        selector: '#workspace-workflows',
        side: 'bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Notebooks',
        content: (
          <>
            Work with Jupyter notebooks on the platform. Try our examples to get started with our
            standardized data, including morphologies, circuits and large-scale simulations.
          </>
        ),
        selector: '#workspace-notebooks',
        side: 'bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Reports',
        content: (
          <>
            Summarize your validations or predictions you’d like to share, or create a showcase of
            your project.
          </>
        ),
        selector: '#workspace-reports',
        side: 'bottom-right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Help',
        content: (
          <>
            Find all the information you need to get started: from videos, to guides and glossaries.
          </>
        ),
        selector: '#workspace-help',
        side: 'bottom-right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Ai Assistant',
        content: (
          <>
            Chat with our AI assistant: ask questions about our data or ask it to read and summarise
            a paper for you.
          </>
        ),
        selector: '#workspace-ai',
        side: 'left',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 10,
      },
    ],
  },
  {
    tour: dataTour,
    steps: [
      {
        icon: null,
        title: 'Data location',
        content: <>Browse public and project data.</>,
        selector: '#scope-selector',
        side: 'bottom-left',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Atlas',
        content: <>Selecting the top level will show all available data</>,
        selector: '#atlas-regions-selector',
        side: 'right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Data types',
        content: <>Choose the data type you’d like to view.</>,
        selector: '#data-type-selector',
        side: 'right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Artifact type',
        content: <>Choose the artifact type you’d like to view.</>,
        selector: '#data-type-items-container',
        side: 'right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 16,
      },
      // {
      //   icon: null,
      //   title: 'Upload your data',
      //   content: (
      //     <>
      //       Upload your own data artifacts. We’ll ensure that it’s standardized so it’s easy to use with our Notebooks and Workflows. This will also allow you to make your own data publicly usable if you would like.
      //     </>
      //   ),
      //   selector: '#upload-data-selector',
      //   side: 'bottom',
      //   showControls: true,
      //   blockKeyboardControl: true,
      //   pointerPadding: 4,
      //   pointerRadius: 25,
      // },
      {
        icon: null,
        title: 'Visualizer',
        content: (
          <>
            Here you can view the selected brain region. You’ll also view the available artifacts
            here when you select an artifact type.
          </>
        ),
        selector: '#three-d-area',
        side: 'left',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 16,
      },
    ],
  },

  {
    tour: workflowTour,
    steps: [
      {
        icon: null,
        title: 'Start a workflow',
        content: <>Choose a workflow category to get started.</>,
        selector: '#workflow-scrollable-selector',
        side: 'bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 0,
        pointerRadius: 16,
      },
      {
        icon: null,
        title: 'Workflow filters',
        content: <>Filter your existing workflows by category and type.</>,
        selector: '#workflow-category-and-type-selector',
        side: 'bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 0,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Workflow tables',
        content: (
          <>
            View your previously generated and completed workflows. Duplicate workflows and re-run
            to iterate quickly.
          </>
        ),
        selector: '#workflow-activities-table',
        side: 'top',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 0,
        pointerRadius: 14,
      },
    ],
  },
  // {
  //   tour: notebookTour,
  //   steps: [],
  // },
];

export function useNextStepOnboarding({
  condition,
  tour,
}: {
  condition: boolean | (() => boolean);
  tour: string;
}) {
  const { startNextStep } = useNextStep();
  const { data, isFetched, isError } = useOnboardingStatus();

  useLayoutEffect(() => {
    const shouldStart = typeof condition === 'function' ? condition() : condition;

    if (!shouldStart || !isFetched || isError) return;

    // check if tour is completed or dismissed in backend data
    const tourStatus = data?.[tour];
    const isDone = tourStatus?.completed || tourStatus?.dismissed;

    if (!isDone || !data) {
      startNextStep(tour);
    }
  }, [condition, tour, data, isFetched, isError, startNextStep]);
}
