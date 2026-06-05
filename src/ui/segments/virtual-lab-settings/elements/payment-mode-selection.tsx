'use client';

import { CreditCardOutlined, DollarOutlined, TagOutlined } from '@ant-design/icons';

import { SparklesFill } from '@/components/icons/sparkles';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

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

type PaymentModeOptionConfig = {
  mode: TPurchaseModeDictionary;
  ownerOnly: boolean;
  gradientClassName: string;
  icon: ReactNode;
  iconWrapperClassName: string;
  title: string;
  description: string;
  footerIcon: ReactNode;
  footer: string;
  footerClassName: string;
  glowClassName: string;
  glowHoverClassName: string;
};

const PaymentModeOptions: PaymentModeOptionConfig[] = [
  {
    mode: PurchaseModeDictionary.Buy,
    ownerOnly: false,
    gradientClassName: 'from-primary-8 to-primary-9/95',
    icon: <CreditCardOutlined className="text-[2.5rem] text-white!" />,
    iconWrapperClassName: 'bg-white/20',
    title: 'Purchase Credits',
    description: 'Buy credits with your card and start using them immediately',
    footerIcon: <DollarOutlined className="h-4 w-4" />,
    footer: 'Secure payment via Stripe',
    footerClassName: 'text-white/60',
    glowClassName: 'bg-white/10',
    glowHoverClassName: 'group-hover:bg-white/20',
  },
  {
    mode: PurchaseModeDictionary.Promo,
    ownerOnly: true,
    gradientClassName: 'from-teal-600/80 to-teal-700/95',
    icon: <SparklesFill className="size-10 text-teal-100" />,
    iconWrapperClassName: 'bg-teal-400/30',
    title: 'Promo Code',
    description: 'Have a promotional code? Redeem it here for free credits',
    footerIcon: <TagOutlined className="h-4 w-4" />,
    footer: 'Instant credit redemption',
    footerClassName: 'text-teal-200/80',
    glowClassName: 'bg-teal-400/20',
    glowHoverClassName: 'group-hover:bg-teal-400/30',
  },
];

function PaymentModeOptionButton({
  onClick,
  gradientClassName,
  icon,
  iconWrapperClassName,
  title,
  description,
  footerIcon,
  footer,
  footerClassName,
  glowClassName,
  glowHoverClassName,
}: Omit<PaymentModeOptionConfig, 'mode' | 'ownerOnly'> & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl bg-linear-to-br',
        'p-8 text-left backdrop-blur-lg transition-all hover:shadow-bnb',
        gradientClassName
      )}
    >
      <div className="relative z-10">
        <div className={cn('mb-4 inline-flex rounded-xl p-3', iconWrapperClassName)}>{icon}</div>
        <h2 className="mb-2 text-2xl font-bold text-white">{title}</h2>
        <p className="text-white/70">{description}</p>
        <div className={cn('mt-6 flex items-center gap-2 text-sm', footerClassName)}>
          {footerIcon}
          <span>{footer}</span>
        </div>
      </div>
      <div
        className={cn(
          'absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl transition-all',
          glowClassName,
          glowHoverClassName
        )}
      />
    </button>
  );
}

export function PaymentModeSelection({
  virtualLabId,
  onModeChange,
  classnames,
}: {
  virtualLabId: string;
  onModeChange: (m: TPurchaseModeDictionary) => void;
  classnames?: {
    root?: string;
  };
}) {
  const { isVirtualLabOwner: isOwner } = useWorkspaceMembership({ virtualLabId });
  const visibleOptions = PaymentModeOptions.filter((option) => !option.ownerOnly || isOwner);

  return (
    <div
      id="payment-mode-selection"
      data-testid="payment-mode-selection"
      className={cn(
        'grid gap-4 py-5 select-none md:grid-cols-2',
        {
          'md:grid-cols-1': visibleOptions.length === 1,
        },
        classnames?.root
      )}
    >
      {visibleOptions.map(({ mode, ownerOnly: _ownerOnly, ...option }) => (
        <PaymentModeOptionButton key={mode} {...option} onClick={() => onModeChange(mode)} />
      ))}
    </div>
  );
}
