'use client';

import { RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import Image from 'next/image';

import { VirtualLabSetup } from '@/ui/segments/app-onboarding/virtual-lab-step';
import { ProjectStep } from '@/ui/segments/app-onboarding/project-step';
import Logo from '@/components/logo/as-svg';

type Step = 'auth' | 'virtual-lab' | 'project';

export function OnboardingFlow({
  flowStep,
  meta,
}: {
  flowStep?: Step;
  meta: {
    virtualLabId: string;
    virtualLabName: string;
  } | null;
}) {
  const [flow] = useState<{
    step: Step;
    meta: {
      virtualLabId: string;
      virtualLabName: string;
    } | null;
  }>({
    step: flowStep ?? 'virtual-lab',
    meta,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50">
      <div className="absolute right-0 bottom-0 h-[285px] w-[503px] opacity-90">
        <Image
          src="/images/brain-visualization.png"
          alt=""
          fill
          className="object-cover object-bottom-right"
          priority
        />
      </div>

      <div className="relative z-10 mx-auto flex h-screen w-screen flex-col items-center justify-center md:mt-0">
        <div className="fixed top-6 left-10 md:mb-6">
          <Logo className="text-primary-9" />
        </div>

        <div className="text-neutral-2 mb-8 flex items-center justify-center gap-2">
          <span className="text-neutral-4">Account</span>
          <span>
            <RightOutlined className="text-sm" />
          </span>
          <span
            className={flow.step === 'virtual-lab' ? 'text-primary-9 font-bold' : 'text-neutral-4'}
          >
            Virtual Lab
          </span>
          <RightOutlined className="text-sm" />
          <span className={flow.step === 'project' ? 'text-primary-9 font-bold' : 'text-neutral-4'}>
            Project
          </span>
        </div>

        <div className="flex items-center justify-center">
          <div className="scale-100 transform opacity-100 transition-all duration-500 ease-in-out">
            {flow.step === 'virtual-lab' && <VirtualLabSetup />}

            {flow.step === 'project' && (
              <ProjectStep
                virtualLabId={flow.meta?.virtualLabId}
                virtualLabName={flow.meta?.virtualLabName}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
