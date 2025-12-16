'use client';

import { useState } from 'react';

import { PlanV2 } from '@/api/sanity/pricing/planv2';
import PlanBody from '@/ui/segments/plans/body';
import PlanHeader from '@/ui/segments/plans/header';

export default function PlanCard({ plan }: { plan: PlanV2 }) {
  const [subscription, setSubscription] = useState<'month' | 'year'>('month');

  return (
    <div className="border-neutral-2 relative w-full rounded-xl border bg-white p-6">
      <PlanHeader plan={plan} subscription={subscription} setSubscription={setSubscription} />
      <PlanBody plan={plan} />
    </div>
  );
}
