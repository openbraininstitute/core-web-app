import { cn } from '@/utils/css-class';

import { COST_EXAMPLES, chargedTiers, plainDecimal, tierCost } from '../helpers';
import { ChargeType } from '../types';

import type { TChargeType, TPriceTier } from '../types';

const CELL = 'border-neutral-2 border-b px-3 py-2 text-left';
const NUMBER = 'font-mono tabular-nums';

export function PriceTiersTable({ type, tiers }: { type: TChargeType; tiers: TPriceTier[] }) {
  const storage = type === ChargeType.Storage;

  return (
    <table className="border-neutral-2 w-full rounded-lg border bg-white text-sm">
      <thead className="text-neutral-4">
        <tr>
          <th className={CELL}>Usage</th>
          {!storage && <th className={CELL}>Fixed cost</th>}
          <th className={CELL}>{storage ? 'Per byte-second' : 'Per unit'}</th>
        </tr>
      </thead>
      <tbody className="text-primary-9">
        {tiers.map((tier) => (
          <tr key={tier.min_quantity}>
            <td className={CELL}>
              <span className={NUMBER}>{tier.min_quantity}</span>
              {tier.max_quantity === null ? (
                ' and above'
              ) : (
                <>
                  {' to '}
                  <span className={NUMBER}>{tier.max_quantity}</span>
                </>
              )}
            </td>
            {!storage && <td className={cn(CELL, NUMBER)}>{plainDecimal(tier.fixed_cost)}</td>}
            <td className={cn(CELL, NUMBER)}>{plainDecimal(tier.multiplier)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CostExamples({ type, tiers }: { type: TChargeType; tiers: TPriceTier[] }) {
  const charged = chargedTiers({ service_type: type, tiers });

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {COST_EXAMPLES[type].map((example) => (
        <li key={example.label} className="flex justify-between gap-4">
          <span className="text-neutral-4">{example.label}</span>
          <span className={NUMBER}>{tierCost(charged, example.quantity)} credits</span>
        </li>
      ))}
    </ul>
  );
}
