'use client';

import { useState } from 'react';

import { PlanV2 } from '@/types/virtual-lab/pricing';
import PlanBody from '@/ui/segments/plans/body';
import PlanHeader from '@/ui/segments/plans/header';

export default function PlanCard({ plan }: { plan: PlanV2 }) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  return (
    <div className="border-neutral-2 relative w-full rounded-xl border bg-white p-6">
      <PlanHeader
        plan={plan}
        billingInterval={billingInterval}
        setBillingInterval={setBillingInterval}
      />
      <PlanBody plan={plan} />
    </div>
  );
}
