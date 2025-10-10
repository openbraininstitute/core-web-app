'use client';

import { NextStepProvider as OnboardingProvider, NextStep as OnboardingSteps } from 'nextstepjs';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import unionBy from 'es-toolkit/compat/unionBy';

import type { CardComponentProps, Tour } from 'nextstepjs';
import type { ReactNode } from 'react';

import { AUTO_ONBOARDING_TOURS } from '@/constants';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/ui/molecules/button';
import { Card } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

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

  return (
    <OnboardingProvider>
      <OnboardingSteps
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
        showNextStep
        onSkip={(step, tour) => {
          updateOnboardingState({
            tours: unionBy(
              [{ tour, done: true, date: new Date().getTime(), step: null }],
              onboardingState.tours,
              'tour'
            ),
          });
        }}
        onStepChange={(step, tour) => {
          updateOnboardingState({
            tours: unionBy(
              [{ tour, done: false, date: new Date().getTime(), step }],
              onboardingState.tours,
              'tour'
            ),
          });
        }}
        onComplete={(tour) => {
          updateOnboardingState({
            tours: unionBy(
              [{ tour, done: true, date: new Date().getTime(), step: null }],
              onboardingState.tours,
              'tour'
            ),
          });
        }}
      >
        {children}
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
  const onNextStep = () => nextStep();

  return (
    <Card className="w-max max-w-xs gap-0 rounded-3xl border-0 bg-white p-0">
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
          <Button rounded onClick={onNextStep}>
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
          'flex items-center justify-center text-white [&_svg]:-top-[19px]!',
          { '[&_svg]:left-[20px]!': step.side === 'bottom-left' },
          { '[&_svg]:right-[20px]!': step.side === 'bottom-right' },
          {
            '[&_svg]:top-1/2! [&_svg]:-right-[20px]!':
              step.side === 'left' || step.side === 'right',
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
export const workflowTourFull = `${defaultWorkspaceTour}/workflow-full`;
export const workflowTourEmpty = `${defaultWorkspaceTour}/workflow-empty`;
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
            Here you can manage your virtual labs, projects, user account and subscription. You can
            already invite people to your lab or project, and buy credits.
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
        content: (
          <>
            Here are your remaining project credits. You can also transfer credits between projects.
          </>
        ),
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
          <>View your project’s latest activities, invite new members and manage your credits.</>
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
            community or OBI. All data is standardized and curated, allowing you to instantly start
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
            Work with Jupyter notebooks on the platform. Try our examples showing you how to get
            started with our standardized data, from morphologies, circuits or large-scale
            simulations.
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
            Reports are quick summaries of research: from showcases of your project, to summaries of
            validations and predictions you’d like to share.
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
        pointerRadius: 16,
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
        content: <>Choose the artifcact type you’d like to view.</>,
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
    tour: workflowTourFull,
    steps: [
      {
        icon: null,
        title: 'Workflow category',
        content: (
          <>
            To start you will have only one project. You can create as many projects as you want and
            invite collaborators to run experiments. You will also find your virtual lab management
            system for credits.{' '}
          </>
        ),
        selector: '#workflow-category-selector',
        side: 'left-bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 0,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Name',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
        selector: '#activity-table-name-cell-selector',
        side: 'bottom-left',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 16,
      },
      {
        icon: null,
        title: 'Category',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
        selector: '#activity-table-category-cell-selector',
        side: 'bottom-right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 16,
      },
      {
        icon: null,
        title: 'Type',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
        selector: '#activity-table-type-cell-selector',
        side: 'bottom-right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 16,
      },
      {
        icon: null,
        title: 'Create new',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
        selector: '#new-workflow-button',
        side: 'bottom-right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
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
