'use client';

import { CheckOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { isNil } from 'es-toolkit/compat';

import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';
import { cn } from '@/utils/css-class';

import type { IProgressStep } from '@/ui/segments/contribute/shared/types';

interface ISubmitEntityProgressProps {
  steps: Array<IProgressStep>;
}

interface IProgressCircleProps {
  progress: number;
}

function ProgressCircle({ progress }: IProgressCircleProps) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div className="relative">
      <svg className="h-64 w-64 -rotate-90 transform xl:h-72 xl:w-72" viewBox="0 0 128 128">
        {/* background circle */}
        <circle cx="64" cy="64" r={radius} stroke="#e5e7eb" strokeWidth="4" fill="none" />
        {/* progress circle */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#003a8c"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-primary-8 text-3xl font-bold select-none xl:text-4xl">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

interface IStepStatusIconProps {
  status?: IProgressStep['status'];
}

function StepStatusIcon({ status }: IStepStatusIconProps) {
  if (isNil(status)) {
    return <div className="bg-primary-8 ml-1 size-3 rounded-full!" />;
  }

  switch (status) {
    case 'pending':
      return <LoadingOutlined className="text-primary-6 animate-spin text-lg" />;
    case 'success':
      return <CheckOutlined className="text-lg text-teal-600" />;
    case 'error':
      return <CloseOutlined className="text-error text-lg" />;
    default:
      return <div className="bg-primary-8 ml-1 size-3 rounded-full!" />;
  }
}

interface IStepItemProps {
  step: IProgressStep;
}

function StepItem({ step }: IStepItemProps) {
  return (
    <div className="flex items-center gap-2">
      <StepStatusIcon status={step.status} />
      <span
        className={cn('select-none', {
          'text-primary-6': step.status === 'pending',
          'font-bold text-teal-600': step.status === 'success',
          'text-error': step.status === 'error',
        })}
      >
        {step.label || 'Processing...'}
      </span>
    </div>
  );
}

export function SubmitEntityProgress({ steps }: ISubmitEntityProgressProps) {
  const completedSteps = steps.filter((step) => step.status === 'success');
  const progress = (completedSteps.length / steps.length) * 100;

  return (
    <HydrateWrapper>
      <div className="flex w-full max-w-max flex-col items-center justify-center space-y-6">
        <ProgressCircle progress={progress} />
        <div className="text-primary-8 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-col items-start gap-2 text-base font-medium">
            {steps.map((step) => (
              <StepItem key={step.key} step={step} />
            ))}
          </div>
        </div>
      </div>
    </HydrateWrapper>
  );
}
