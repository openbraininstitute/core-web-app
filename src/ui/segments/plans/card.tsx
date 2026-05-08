'use client';

import { useState } from 'react';

import PlanBody from '@/ui/segments/plans/body';
import PlanHeader from '@/ui/segments/plans/header';
import { cn } from '@/utils/css-class';

import type { PlanV2 } from '@/types/virtual-lab/pricing';

export function PlanCard({
  plan,
  dark,
  className,
  hideContactButton,
}: {
  plan: PlanV2;
  dark?: boolean;
  className?: string;
  hideContactButton?: boolean;
}) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  return (
    <div
      className={cn(
        'relative w-full rounded-xl border p-6',
        dark ? 'border-primary-7 bg-primary-9 text-white' : 'border-neutral-2 bg-white',
        className
      )}
    >
      <PlanHeader
        plan={plan}
        billingInterval={billingInterval}
        setBillingInterval={setBillingInterval}
        dark={dark}
        hideContactButton={hideContactButton}
      />
      <PlanBody plan={plan} dark={dark} />
    </div>
  );
}
