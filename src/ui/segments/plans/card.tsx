'use client';

import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { useState } from 'react';

import PlanBody from '@/ui/segments/plans/body';
import PlanHeader from '@/ui/segments/plans/header';
import { cn } from '@/utils/css-class';

import type { PlanV2 } from '@/types/virtual-lab/pricing';

export default function PlanCard({
  plan,
  compact = false,
  dark,
  className,
  hideContactButton,
}: {
  plan: PlanV2;
  compact?: boolean;
  dark?: boolean;
  className?: string;
  hideContactButton?: boolean;
}) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'relative w-full rounded-xl border',
        compact ? 'p-4' : 'p-6',
        dark ? 'border-primary-7 bg-primary-9 text-white' : 'border-neutral-2 bg-white',
        className
      )}
    >
      <PlanHeader
        plan={plan}
        billingInterval={billingInterval}
        setBillingInterval={setBillingInterval}
        compact={compact}
        dark={dark}
        hideContactButton={hideContactButton}
      />
      {compact ? (
        <>
          {expanded && <PlanBody plan={plan} dark={dark} />}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-primary-9 mt-3 flex w-full items-center justify-center gap-2 text-sm font-semibold select-none hover:underline"
          >
            {expanded ? 'Show less' : 'Show details'}
            {expanded ? <UpOutlined /> : <DownOutlined />}
          </button>
        </>
      ) : (
        <PlanBody plan={plan} dark={dark} />
      )}
    </div>
  );
}
