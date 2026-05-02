'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getPricingContent } from '@/services/sanity';
import PlanCard from '@/ui/segments/plans/card';
import { Subscription } from '@/ui/segments/profile/sections/subscription';
import { cn } from '@/utils/css-class';

import type { PlanV2 } from '@/types/virtual-lab/pricing';

type Plan = {
  id: string;
  name: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    features: [
      '100 free initial credits',
      'Get a Virtual Lab',
      'Join any lab',
      'Invite lab members',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    features: ['Everything in Free', 'More credits', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    features: ['Everything in Pro', 'Custom credit packages', 'SSO & admin tools'],
  },
  {
    id: 'education',
    name: 'Education',
    features: ['Discounted access for educators', 'Classroom seats', 'Curriculum support'],
  },
];

function SelectedPlanCard({ planId }: { planId: string }) {
  const [plans, setPlans] = useState<PlanV2[] | null>(null);

  useEffect(() => {
    getPricingContent()
      .then((data) => setPlans(data ?? []))
      .catch(() => setPlans([]));
  }, []);

  if (!plans) return null;

  const plan = plans.find((p) => p.name.toLowerCase() === planId.toLowerCase());
  if (!plan) {
    return <div className="text-primary-9/70">Plan details unavailable.</div>;
  }

  return (
    <div className="border-primary-7 bg-primary-9 flex h-full min-h-0 flex-col overflow-hidden rounded-xl border">
      <div className="primary-scrollbar min-h-0 flex-1 overflow-y-auto">
        <PlanCard plan={plan} dark hideContactButton className="border-0 bg-transparent" />
      </div>
    </div>
  );
}

export function PricingView({ slot }: { slot?: 'nav' | 'content' } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get('plan') ?? PLANS[0].id;

  const handleSelect = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('plan', id);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  };

  if (slot === 'nav') {
    return (
      <div className="flex w-full flex-col gap-3">
        {PLANS.map((plan) => {
          const isActive = plan.id === activeId;
          return (
            <button
              key={plan.id}
              type="button"
              aria-label={`View ${plan.name} plan`}
              onClick={() => handleSelect(plan.id)}
              className={cn(
                'flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition-colors',
                isActive
                  ? 'bg-primary-7 border-primary-5 text-white'
                  : 'border-primary-7 bg-primary-9 hover:bg-primary-8 text-white'
              )}
            >
              <span className="text-lg font-bold">{plan.name}</span>
              <ul className="flex flex-col gap-1 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="text-white/90">
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    );
  }

  if (slot === 'content') {
    return (
      <div className="mb-32 h-full max-h-[calc(100vh-18rem)] w-full overflow-y-auto p-4">
        <SelectedPlanCard planId={activeId} />
      </div>
    );
  }

  return (
    <div className="bg-primary-9 flex h-full max-h-full w-full flex-col overflow-hidden rounded-2xl px-1 py-4">
      <div className="flex h-full min-h-0 w-full flex-col text-white">
        <Subscription />
      </div>
    </div>
  );
}

export default PricingView;
