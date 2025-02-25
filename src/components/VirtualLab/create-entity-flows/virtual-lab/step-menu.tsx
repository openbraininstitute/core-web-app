'use client';

import { atom, useAtom } from 'jotai';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/VirtualLab/create-entity-flows/common/breadcrumb';
import { Step } from '@/components/VirtualLab/create-entity-flows/common/types';
import { classNames } from '@/util/utils';

const steps: Array<{ id: Step; label: string }> = [
  { id: 'information', label: 'Information' },
  { id: 'plans', label: 'Plans' },
  { id: 'members', label: 'Members' },
];

export const flowSteps = atom<Step>('information');

export default function StepMenu() {
  const [currentStep, setCurrentStep] = useAtom(flowSteps);
  return (
    <div className="relative flex max-h-max w-full flex-grow items-center gap-4 bg-primary-9 px-4 py-4">
      <div className="absolute left-4 top-4 py-2 text-xl font-bold text-white">
        Virtual lab creation
      </div>
      <div className="flex flex-grow justify-center">
        <Breadcrumb>
          <BreadcrumbList className="gap-4">
            {steps.map((step, index) => (
              <>
                <BreadcrumbItem key={step.id}>
                  <button
                    type="button"
                    aria-label={step.label}
                    onClick={() => setCurrentStep(step.id)}
                    className={classNames(
                      'cursor-pointer px-3 py-2 text-lg font-bold uppercase  tracking-wide hover:bg-white/15',
                      currentStep === step.id ? 'text-white' : 'text-primary-5'
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
