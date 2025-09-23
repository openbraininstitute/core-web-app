'use client';

import { NextStepProvider as OnboardingProvider, NextStep as OnboardingSteps } from 'nextstepjs';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import unionBy from 'lodash/unionBy';

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
        <div className="flex flex-nowrap items-center justify-center gap-1">
          <LeftOutlined
            onClick={() => {
              if (currentStep + 1 <= totalSteps && currentStep > 0) prevStep();
            }}
            className={cn('text-primary-8 text-sm', { 'text-neutral-3': currentStep === 0 })}
          />
          {currentStep + 1} of {totalSteps}
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
        title: 'Projects',
        content: (
          <>
            To start you will have only one project. You can create as many projects as you want and
            invite collaborators to run experiments. You will also find your virtual lab management
            system for credits.{' '}
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
        title: 'Credits',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
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
        title: 'Data',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
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
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
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
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
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
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
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
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
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
        title: 'Ai assistant',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
        selector: '#workspace-ai',
        side: 'left',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
    ],
  },
  {
    tour: dataTour,
    steps: [
      {
        icon: null,
        title: 'Data location',
        content: (
          <>
            To start you will have only one project. You can create as many projects as you want and
            invite collaborators to run experiments. You will also find your virtual lab management
            system for credits.{' '}
          </>
        ),
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
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
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
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
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
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
        selector: '#data-type-items-container',
        side: 'right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 16,
      },
      {
        icon: null,
        title: 'Upload your data',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
        selector: '#upload-data-selector',
        side: 'bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Visualizer',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
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
        viewportID: 'workflow-viewport',
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
        viewportID: 'workflow-viewport',
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
        viewportID: 'workflow-viewport',
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
        viewportID: 'workflow-viewport',
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
        viewportID: 'workflow-viewport',
      },
    ],
  },
  {
    tour: notebookTour,
    steps: [
      {
        icon: null,
        title: 'Notebook location',
        content: (
          <>
            To start you will have only one project. You can create as many projects as you want and
            invite collaborators to run experiments. You will also find your virtual lab management
            system for credits.{' '}
          </>
        ),
        selector: '#notebook-scope-selector',
        side: 'left-bottom',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
      {
        icon: null,
        title: 'Notebook type',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
        selector: '#notebook-type-menu-selector',
        side: 'right',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 16,
      },
      {
        icon: null,
        title: 'View in JupyterHub',
        content: (
          <>
            Lorem ipsum dolor sit amet est tincidunt consequat ultricies justo donec. Labore aliquam
            lectus elit adipiscing consectetur lectus enim fusce velit netus.
          </>
        ),
        selector: '#view-in-jupyter-selector',
        side: 'bottom-left',
        showControls: true,
        blockKeyboardControl: true,
        pointerPadding: 4,
        pointerRadius: 25,
      },
    ],
  },
];
