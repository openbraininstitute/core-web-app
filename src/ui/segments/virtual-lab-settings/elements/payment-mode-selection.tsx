'use client';

import { CreditCardOutlined, DollarOutlined, TagOutlined } from '@ant-design/icons';

import { SparklesFill } from '@/components/icons/sparkles';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { cn } from '@/utils/css-class';

export const PurchaseMode = {
  Buy: {
    key: 'buy-credits',
    label: 'Buy credits',
  },
  Promo: {
    key: 'promotion-code',
    label: 'Promotion code',
  },
  Selection: {
    key: 'selection',
    label: 'Selection',
  },
} as const;

export const PurchaseModeDictionary = Object.fromEntries(
  Object.entries(PurchaseMode).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof PurchaseMode]: (typeof PurchaseMode)[K]['key'];
};

export type TPurchaseModeDictionary =
  (typeof PurchaseModeDictionary)[keyof typeof PurchaseModeDictionary];

export function PaymentModeSelection({
  virtualLabId,
  onModeChange,
}: {
  virtualLabId: string;
  onModeChange: (m: TPurchaseModeDictionary) => void;
}) {
  const { isVirtualLabOwner: isOwner } = useWorkspaceMembership({ virtualLabId });
  return (
    <div
      className={cn('grid gap-4 p-5 select-none md:grid-cols-2', { 'md:grid-cols-1': !isOwner })}
    >
      <button
        type="button"
        onClick={() => onModeChange(PurchaseModeDictionary.Buy)}
        className={cn(
          'group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br',
          'from-[#0a3a76]/40 to-[#0a3a76]/10 p-8 text-left backdrop-blur-lg transition-all',
          'hover:scale-105 hover:from-white/20 hover:to-white/10 hover:shadow-2xl'
        )}
      >
        <div className="relative z-10">
          <div className="mb-4 inline-flex rounded-xl bg-white/20 p-3">
            <CreditCardOutlined className="text-[2.5rem] text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Purchase Credits</h2>
          <p className="text-white/70">
            Buy credits with your card and start using them immediately
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm text-white/60">
            <DollarOutlined className="h-4 w-4" />
            <span>Secure payment via Stripe</span>
          </div>
        </div>
        <div
          className={cn(
            'absolute -top-8 -right-8 h-32 w-32 rounded-full',
            'bg-white/10 blur-2xl transition-all group-hover:bg-white/20'
          )}
        />
      </button>

      {isOwner && (
        <button
          type="button"
          onClick={() => onModeChange(PurchaseModeDictionary.Promo)}
          className={cn(
            'group relative overflow-hidden rounded-2xl bg-gradient-to-br',
            'from-emerald-500/30 to-emerald-500/10 hover:shadow-2xl',
            'p-8 text-left backdrop-blur-lg',
            'transition-all hover:scale-105'
          )}
        >
          <div className="relative z-10">
            <div className="mb-4 inline-flex rounded-xl bg-emerald-400/30 p-3">
              <SparklesFill className="size-10 text-emerald-100" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">Promo Code</h2>
            <p className="text-white/70">
              Have a promotional code? Redeem it here for free credits
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-emerald-200/80">
              <TagOutlined className="h-4 w-4" />
              <span>Instant credit redemption</span>
            </div>
          </div>
          <div
            className={cn(
              'absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-400/20',
              'blur-2xl transition-all group-hover:bg-emerald-400/30'
            )}
          />
        </button>
      )}
    </div>
  );
}
