'use client';

import { Fragment, ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { atomWithReset } from 'jotai/utils';

import { classNames } from '@/util/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/VirtualLab/create-entity-flows/common/breadcrumb';
import { type Step } from '@/components/VirtualLab/create-entity-flows/common/types';

export function createFlowAtom<T>(defaultStep: T) {
  return atomWithReset<T>(defaultStep);
}

type StepMenuProps<T> = {
  steps: Array<Step>;
  title: ReactNode;
  flowAtom: ReturnType<typeof createFlowAtom<T>>;
};

export default function BasicStepMenu<T>({ steps, title, flowAtom }: StepMenuProps<T>) {
  const currentStep = useAtomValue(flowAtom);

  return (
    <div className="bg-primary-9 relative flex max-h-max w-full grow items-center gap-4 px-4">
      <div className="absolute top-4 left-4 py-2 text-xl font-bold text-white">{title}</div>
      <div className="flex grow justify-center">
        <Breadcrumb>
          <BreadcrumbList className="gap-4">
            {steps.map((step, index) => (
              <Fragment key={step.id}>
                <BreadcrumbItem>
                  <button
                    type="button"
                    aria-label={step.label}
                    className={classNames(
                      'cursor-default! px-6 py-6 text-lg tracking-wide uppercase select-none hover:bg-white/15',
                      currentStep === step.id ? 'font-bold text-white' : 'text-primary-3 font-light'
                    )}
                    style={{ cursor: 'default' }}
                  >
                    {step.label}
                  </button>
                </BreadcrumbItem>
                {index < steps.length - 1 && (
                  <BreadcrumbSeparator key={`sep-${step.id}`} className="text-primary-5" />
                )}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
