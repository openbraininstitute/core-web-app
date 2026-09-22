'use client';

import { useState } from 'react';

import PlanBody from '@/ui/segments/plans/body';
import PlanHeader from '@/ui/segments/plans/header';
import { cn } from '@/utils/css-class';

import type { PlanV2 } from '@/types/virtual-lab/pricing';

export function PlanCard({
  plan,
  isCurrentTier,
  className,
  hideContactButton,
  testId,
}: {
  plan: PlanV2;
  isCurrentTier?: boolean;
  className?: string;
  hideContactButton?: boolean;
  testId?: string;
}) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  return (
    <div
      className={cn(
        'relative w-full rounded-xl border p-6',
        isCurrentTier ? 'border-primary-7 bg-bg-white text-primary-9' : 'border-neutral-2 bg-white',
        className
      )}
      data-testid={testId}
    >
      <PlanHeader
        plan={plan}
        billingInterval={billingInterval}
        setBillingInterval={setBillingInterval}
        isCurrentTier={isCurrentTier}
        hideContactButton={hideContactButton}
        testId={testId}
      />
      <PlanBody plan={plan} isCurrentTier={isCurrentTier} />
    </div>
  );
}
