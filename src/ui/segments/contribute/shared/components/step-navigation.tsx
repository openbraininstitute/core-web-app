'use client';

import { CheckCircleFilled, InfoCircleFilled, RightOutlined } from '@ant-design/icons';
import { Fragment, useMemo } from 'react';

import { useContributionPipeline } from '@/ui/segments/contribute/shared/pipeline/context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { DEFAULT_LICENSE_NAME } from '@/ui/segments/contribute/shared/schemas';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { TStepValidationStatus } from '@/ui/segments/contribute/shared/types';

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
      return <CheckCircleFilled className="text-teal-500" />;
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
            side="bottom"
            sideOffset={0}
            avoidCollisions
            className={cn('bg-primary-8 z-[99999]', {
              'bg-teal-500': status === 'valid',
            })}
            arrowClassName={cn('text-primary-8', {
              'text-teal-500': status === 'valid',
            })}
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
    return <CheckCircleFilled className="text-teal-500" />;
  }
  return null;
}

function LicenseStepIcon({ status }: { status: TStepValidationStatus }) {
  return <StepIcon status={status} hasTooltip tooltipContent={DEFAULT_LICENSE_NAME} />;
}

export function StepNavigation() {
  const { progressSteps, activeStep, setActiveStep, stepValidationStatus } =
    useContributionPipeline();

  return (
    <div className="mb-2 flex-shrink-0">
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
