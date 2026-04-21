'use client';

import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { useState } from 'react';

import PlanBody from '@/ui/segments/plans/body';
import PlanHeader from '@/ui/segments/plans/header';

import type { PlanV2 } from '@/types/virtual-lab/pricing';

export default function PlanCard({ plan, compact = false }: { plan: PlanV2; compact?: boolean }) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border-neutral-2 relative w-full rounded-xl border bg-white ${compact ? 'p-4' : 'p-6'}`}
    >
      <PlanHeader
        plan={plan}
        billingInterval={billingInterval}
        setBillingInterval={setBillingInterval}
        compact={compact}
      />
      {compact ? (
        <>
          {expanded && <PlanBody plan={plan} />}
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
        <PlanBody plan={plan} />
      )}
    </div>
  );
}
