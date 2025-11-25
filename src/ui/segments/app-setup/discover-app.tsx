'use client';

import {
  NextStepProvider as OnboardingProvider,
  NextStep as OnboardingSteps,
  useNextStep,
} from 'nextstepjs';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useLayoutEffect, type ReactNode } from 'react';
import { unionBy, find } from 'es-toolkit/compat';

import type { CardComponentProps, Tour } from 'nextstepjs';

import { useLocalStorage } from '@/hooks/use-local-storage';
import { AUTO_ONBOARDING_TOURS } from '@/constants';
import { Button } from '@/ui/molecules/button';
import { Card } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

function QuitOnboardingOnClickOutside({
  onSkipOrComplete,
}: {
  onSkipOrComplete: (tour: string | null) => void;
}) {
  const { isNextStepVisible, closeNextStep, currentTour } = useNextStep();
  const handleClick = () => {
    if (isNextStepVisible) {
      onSkipOrComplete(currentTour);
      closeNextStep();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    isNextStepVisible && (
      <div
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Close onboarding tour"
        className="fixed inset-0 z-[9999] bg-transparent"
      />
    )
  );
}

export function AppOnboardingProvider({ children }: { children: ReactNode }) {
  const [onboardingState, updateOnboardingState] = useLocalStorage<{
    tours: Array<{
      tour: string | null;
      done: boolean | null;
      date: number | null;
      step: number | null;
    }>;
  }>(AUTO_ONBOARDING_TOURS, {
    tours: [],
  });
  const onSkipOrComplete = (tour: string | null) => {
    updateOnboardingState({
      tours: unionBy(
        [{ tour, done: true, date: new Date().getTime(), step: null }],
        onboardingState.tours,
        'tour'
      ),
    });
  };

  return (
    <OnboardingProvider>
      <OnboardingSteps
        showNextStep
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
        onSkip={(_, tour) => onSkipOrComplete(tour)}
        onComplete={onSkipOrComplete}
        onStepChange={(step, tour) => {
          updateOnboardingState({
            tours: unionBy(
              [{ tour, done: false, date: new Date().getTime(), step }],
              onboardingState.tours,
              'tour'
            ),
          });
        }}
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
    <Card id="onboarding-card" className="w-max max-w-xs gap-0 rounded-3xl border-0 bg-white p-0">
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

export const defaultWorkspaceTour = 'workspace';
export const projectTour = `${defaultWorkspaceTour}/projects`;
export const dataTour = `${defaultWorkspaceTour}/data`;
export const workflowTour = `${defaultWorkspaceTour}/workflow`;
export const notebookTour = `${defaultWorkspaceTour}/notebook`;

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
        content: (
          <>
            Select the brain region you want to filter. Selecting “Basic cell groups and regions”
            will show all the available data.
          </>
        ),
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
  {
    tour: notebookTour,
    steps: [
      // {
      //   icon: null,
      //   title: 'Notebook location',
      //   content: (
      //     <>
      //       To start you will have only one project. You can create as many projects as you want and
      //       invite collaborators to run experiments. You will also find your virtual lab management
      //       system for credits.{' '}
      //     </>
      //   ),
      //   selector: '#notebook-scope-selector',
      //   side: 'left-bottom',
      //   showControls: true,
      //   blockKeyboardControl: true,
      //   pointerPadding: 4,
      //   pointerRadius: 25,
      // },
      // {
      //   icon: null,
      //   title: 'Notebook type',
      //   content: (
      //     <>
      //       Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
      //       lectus elit adipiscing consectetur lectus enim fusce velit netus.
      //     </>
      //   ),
      //   selector: '#notebook-type-menu-selector',
      //   side: 'right',
      //   showControls: true,
      //   blockKeyboardControl: true,
      //   pointerPadding: 4,
      //   pointerRadius: 16,
      // },
      // {
      //   icon: null,
      //   title: 'View in JupyterHub',
      //   content: (
      //     <>
      //       Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
      //       lectus elit adipiscing consectetur lectus enim fusce velit netus.
      //     </>
      //   ),
      //   selector: '#view-in-jupyter-selector',
      //   side: 'bottom-left',
      //   showControls: true,
      //   blockKeyboardControl: true,
      //   pointerPadding: 4,
      //   pointerRadius: 25,
      // },
    ],
  },
];

export function useNextStepOnboarding({
  condition,
  tour,
}: {
  condition: boolean | (() => boolean);
  tour: string;
}) {
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
    const tourState = find(onboardingState.tours, { tour });
    if (condition) {
      if (!tourState || !tourState.done) {
        startNextStep(tour);
      }
    }
  }, [condition]); // eslint-disable-line react-hooks/exhaustive-deps
}
