'use client';

import { useAtomValue } from 'jotai';
import { atomWithReset } from 'jotai/utils';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/VirtualLab/create-entity-flows/common/breadcrumb';
import { type Step } from '@/components/VirtualLab/create-entity-flows/common/types';
import { classNames } from '@/util/utils';

export function createFlowAtom<T>(defaultStep: T) {
  return atomWithReset<T>(defaultStep);
}

type StepMenuProps<T> = {
  steps: Array<Step>;
  title: string;
  flowAtom: ReturnType<typeof createFlowAtom<T>>;
};

export default function BasicStepMenu<T>({ steps, title, flowAtom }: StepMenuProps<T>) {
  const currentStep = useAtomValue(flowAtom);

  return (
    <div className="relative flex max-h-max w-full flex-grow items-center gap-4 bg-primary-9 px-4 py-4">
      <div className="absolute left-4 top-4 py-2 text-xl font-bold text-white">{title}</div>
      <div className="flex flex-grow justify-center">
        <Breadcrumb>
          <BreadcrumbList className="gap-4">
            {steps.map((step, index) => (
              <>
                <BreadcrumbItem key={step.id}>
                  <button
                    type="button"
                    aria-label={step.label}
                    className={classNames(
                      'cursor-pointer px-3 py-2 text-lg uppercase tracking-wide hover:bg-white/15',
                      currentStep === step.id ? 'font-bold text-white' : 'font-light text-primary-5'
                    )}
                  >
                    {step.label}
                  </button>
                </BreadcrumbItem>
                {index < steps.length - 1 && (
                  <BreadcrumbSeparator key={`sep-${step.id}`} className="text-primary-5" />
                )}
              </>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
