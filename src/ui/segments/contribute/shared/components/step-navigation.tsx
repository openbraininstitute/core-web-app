'use client';

import {
  CheckCircleFilled,
  InfoCircleFilled,
  RightOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Fragment, useMemo } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { DEFAULT_LICENSE_NAME } from '@/ui/segments/contribute/shared/helpers';
import { useContributionPipeline } from '@/ui/segments/contribute/shared/pipeline/context';
import {
  StepValidationStatus,
  type TStepValidationStatus,
} from '@/ui/segments/contribute/shared/types';
import { cn } from '@/utils/css-class';

interface IStepLabelProps {
  label: string;
  status: TStepValidationStatus;
  isActive: boolean;
}

function StepLabel({ label, status, isActive }: IStepLabelProps) {
  return (
    <div
      className={cn('font-light', {
        'text-error': status === 'invalid',
        'text-primary-8 font-bold': status === 'valid',
        'text-primary-6': status !== 'invalid' && isActive,
      })}
    >
      {label}
    </div>
  );
}

interface IStepIconProps {
  status: TStepValidationStatus;
  hasTooltip?: boolean;
  tooltipContent?: React.ReactNode;
}

function StepIcon({ status, hasTooltip, tooltipContent }: IStepIconProps) {
  const icon = useMemo(() => {
    if (status === 'valid') {
      return <CheckCircleFilled className="text-teal-500!" />;
    }
    if (hasTooltip && status === 'non-touched') {
      return <InfoCircleFilled className="text-primary-8" />;
    }
    return null;
  }, [status, hasTooltip]);

  if (!icon) return null;

  if (hasTooltip && tooltipContent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{icon}</TooltipTrigger>
        {status !== 'invalid' && (
          <TooltipContent
            sideOffset={0}
            avoidCollisions
            data-testid="step-navigation-tooltip"
            side="top"
            align="end"
            className={cn(
              'border border-neutral-200 bg-white! p-0 shadow-[0_16px_40px_rgba(0,0,0,0.16)]',
              'w-80 max-w-70 rounded-xl border border-neutral-200 bg-white p-2 text-sm text-neutral-900 shadow-[0_16px_40px_rgba(0,0,0,0.16)]'
            )}
            arrowClassName="bg-white"
          >
            {tooltipContent}
          </TooltipContent>
        )}
      </Tooltip>
    );
  }

  return icon;
}

function DefaultStepIcon({ status }: { status: TStepValidationStatus }) {
  if (status === 'valid') {
    return <CheckCircleFilled className="text-teal-500!" />;
  }
  return null;
}

function LicenseStepIcon({ status }: { status: TStepValidationStatus }) {
  return <StepIcon status={status} hasTooltip tooltipContent={DEFAULT_LICENSE_NAME} />;
}

function VerticalStepTrailingIcon({
  status,
  isActive,
  hasTooltip,
}: {
  status: TStepValidationStatus;
  isActive: boolean;
  hasTooltip?: boolean;
}) {
  const warn = (
    <WarningFilled
      className={cn('size-4 shrink-0', {
        'text-white!': isActive,
        'text-warning!': !isActive,
      })}
    />
  );

  const check = (
    <CheckCircleFilled
      className={cn('size-4 shrink-0', {
        'text-white!': isActive,
        'text-teal-500!': !isActive,
      })}
    />
  );

  if (status === StepValidationStatus.Valid) {
    if (hasTooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{check}</TooltipTrigger>
          <TooltipContent
            side="left"
            sideOffset={2}
            avoidCollisions
            className={cn('bg-primary-8! z-99999', {
              'bg-teal-500!': !isActive,
            })}
            arrowClassName={cn('text-primary-8', {
              'text-teal-500!': !isActive,
            })}
          >
            {DEFAULT_LICENSE_NAME}
          </TooltipContent>
        </Tooltip>
      );
    }
    return check;
  }

  if (hasTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{warn}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={0}
          avoidCollisions
          className="border border-neutral-200 bg-white p-0 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
          arrowClassName="text-primary-8"
        >
          {DEFAULT_LICENSE_NAME}
        </TooltipContent>
      </Tooltip>
    );
  }

  return warn;
}

export function StepNavigation() {
  const { progressSteps, activeStep, setActiveStep, stepValidationStatus } =
    useContributionPipeline();

  return (
    <div className="mb-2 shrink-0">
      <Breadcrumb>
        <BreadcrumbList className="justify-between gap-0.5 sm:gap-0.5">
          {progressSteps.map((step, index) => {
            const status = stepValidationStatus[step.key] ?? 'non-touched';
            const isActive = activeStep === step.key;

            const IconComponent = step.hasTooltip ? LicenseStepIcon : DefaultStepIcon;
            const customIcon = step.iconRenderer?.(status);

            return (
              <Fragment key={step.key}>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild className={cn('hover:text-primary-6 cursor-pointer')}>
                    <Button
                      borderless
                      rounded
                      type="button"
                      variant="outline"
                      className={cn(
                        'active:text-primary-6 text-label active:bg-neutral-1 bg-transparent px-2 text-base shadow-none'
                      )}
                      onClick={() => setActiveStep(step.key)}
                    >
                      <StepLabel label={step.label} status={status} isActive={isActive} />
                      {customIcon ?? <IconComponent status={status} />}
                    </Button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {index < progressSteps.length - 1 && (
                  <BreadcrumbSeparator>
                    <RightOutlined className="text-primary-9 size-2" />
                  </BreadcrumbSeparator>
                )}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

interface IVerticalStepNavigationProps {
  forceValidState?: boolean;
  suppressActiveSelection?: boolean;
}

export function VerticalStepNavigation({
  forceValidState = false,
  suppressActiveSelection = false,
}: IVerticalStepNavigationProps) {
  const { progressSteps, activeStep, setActiveStep, stepValidationStatus } =
    useContributionPipeline();

  return (
    <div className="border-neutral-2 mt-4 flex w-full flex-col gap-2 border-t pt-4">
      {progressSteps.map((step) => {
        const status = forceValidState ? 'valid' : (stepValidationStatus[step.key] ?? 'invalid');
        const isActive = !suppressActiveSelection && activeStep === step.key;
        const customIcon = step.iconRenderer?.(status);

        return (
          <Button
            rounded
            id={`step-navigation-button-${step.key}`}
            key={step.key}
            size="responsive"
            type="button"
            variant={isActive ? 'shadow' : 'outline'}
            onClick={() => setActiveStep(step.key)}
            className={cn(
              'md:h-10 lg:h-12 w-full justify-between font-normal',
              'group hover:bg-primary-9!'
            )}
          >
            <span
              className={cn('step-v-label flex-1 text-left text-sm font-light', {
                'font-bold text-white': isActive,
                'text-primary-9! group-hover:text-white!': !isActive,
              })}
            >
              {step.label}
            </span>
            <span className="flex items-center gap-1">
              <span
                className={cn({
                  '[&_.anticon]:text-white!': isActive && Boolean(customIcon),
                })}
              >
                {customIcon ?? (
                  <VerticalStepTrailingIcon
                    hasTooltip={step.hasTooltip}
                    isActive={isActive}
                    status={status}
                  />
                )}
              </span>
              <RightOutlined
                className={cn('[&>svg]:size-2.5!', {
                  'text-white!': isActive,
                  'text-primary-9! group-hover:text-white!': !isActive,
                })}
              />
            </span>
          </Button>
        );
      })}
    </div>
  );
}
