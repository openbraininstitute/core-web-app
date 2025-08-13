'use client';

import { NextStepProvider as OnboardingProvider, NextStep as OnboardingSteps } from 'nextstepjs';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { CardComponentProps, Tour } from 'nextstepjs';
import type { ReactNode } from 'react';

import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/ui/molecules/button';
import { Card } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';
import { AUTO_ONBOARDING_DONE } from '@/constants';

export function AppOnboardingProvider({ children }: { children: ReactNode }) {
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
          ease: 'anticipate',
          stiffness: 100,
          damping: 10,
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
  const [, updateOnboardingState] = useLocalStorage<{ date: number | null; done: boolean }>(
    AUTO_ONBOARDING_DONE,
    {
      done: false,
      date: null,
    }
  );

  const onClose = () => {
    skipTour?.();
    updateOnboardingState({ done: true, date: new Date().getTime() });
  };

  return (
    <Card className="w-max max-w-xs gap-0 rounded-3xl border-0 bg-white p-0">
      <div className="flex w-full items-start justify-between px-6 pt-4 pb-0">
        <h1 className="text-primary-9 mb-2 text-lg font-bold">{step.title}</h1>
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
          <Button variant="ghost" onClick={onClose}>
            Skip
          </Button>
        )}
        {currentStep + 1 !== totalSteps && (
          <Button rounded onClick={() => nextStep()}>
            Next tip
          </Button>
        )}
        {currentStep + 1 === totalSteps && (
          <Button rounded onClick={onClose}>
            Get started
          </Button>
        )}
      </div>
      <span
        className={cn(
          'flex items-center justify-center text-white [&_svg]:-top-[19px]!',
          { '[&_svg]:left-[20px]!': step.side === 'bottom-left' },
          { '[&_svg]:right-[20px]!': step.side === 'bottom-right' },
          { '[&_svg]:top-1/2! [&_svg]:-right-[20px]!': step.side === 'left' }
        )}
      >
        {arrow}
      </span>
    </Card>
  );
}

export const defaultWorkspaceTour = 'workspace';

export const OnboardingDiscoverSteps: Tour[] = [
  {
    tour: defaultWorkspaceTour,
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
        pointerPadding: 4,
        pointerRadius: 25,
      },
    ],
  },
];
