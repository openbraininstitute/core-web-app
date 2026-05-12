'use client';

import { ArrowLeftOutlined, ExportOutlined, LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';

import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { SubscriptionStatus } from '@/api/virtual-lab-svc/queries/types';
import { CheckoutFlow } from '@/components/VirtualLab/create-entity-flows/checkout';
import { DowngradeFree } from '@/components/VirtualLab/create-entity-flows/checkout/downgrade';
import { SubscriptionCheckoutError } from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';
import { keyBuilder } from '@/ui/use-query-keys/user';
import { cn } from '@/utils/css-class';

import type { Dispatch, SetStateAction } from 'react';
import type { UserActiveSubscriptionResponse } from '@/api/virtual-lab-svc/queries/types';

type SubscriptionProps = {
  onExpandedChange?: (expanded: boolean) => void;
};

const SubscriptionModeDict = {
  Current: 'current',
  Tiers: 'tiers',
  Downgrade: 'downgrade',
} as const;

type TSubscriptionMode = (typeof SubscriptionModeDict)[keyof typeof SubscriptionModeDict];
type TSubscriptionTier = NonNullable<UserActiveSubscriptionResponse>['subscription']['tier'];

type LoadedSubscriptionResponse = NonNullable<UserActiveSubscriptionResponse>;

type SubscriptionViewState =
  | { tag: 'loading' }
  | { tag: 'error' }
  | { tag: 'ready'; data: LoadedSubscriptionResponse };

const TierText: Record<TSubscriptionTier, { description: string; name: string }> = {
  FREE: {
    name: 'Free account',
    description: 'Standard access to build models and run simulations.',
  },
  PRO: {
    name: 'Pro account',
    description: '50% on all the credits to run simulation and build models',
  },
  PREMIUM: {
    name: 'Premium account',
    description: 'Advanced support and scale for high-volume research teams.',
  },
};

function SubscriptionLoading() {
  return (
    <div className="text-primary-9 flex h-40 items-center justify-center">
      <LoadingOutlined spin />
    </div>
  );
}

function CurrentSubscriptionCard({
  data,
  onChangeSubscription,
  onDowngrade,
}: {
  data: LoadedSubscriptionResponse;
  onChangeSubscription: () => void;
  onDowngrade: () => void;
}) {
  const subscription = data.subscription;
  const tier = subscription.tier;
  const tierContent = TierText[tier];

  const isPaid = tier !== 'FREE' && subscription.status === SubscriptionStatus.ACTIVE;
  const isCanceling = Boolean(subscription.cancel_at_period_end || subscription.canceled_at);

  return (
    <section className={cn('rounded-2xl bg-white p-6')}>
      {/* <p className="text-gray-400 text-lg mb-1">Current</p> */}
      <div
        className={cn(
          'p-0.5 rounded-xl bg-white',
          'shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)]'
        )}
      >
        <div
          className={cn(
            'relative min-h-32 overflow-hidden rounded-[0.625rem] bg-primary-9 text-white',
            'flex items-center bg-no-repeat px-8 py-6'
          )}
          style={{
            backgroundImage: "url('/images/brain-visualization-v3.webp')",
            backgroundPosition: 'right center',
            backgroundSize: 'auto 100%',
          }}
        >
          <div className="relative z-10 max-w-80">
            <h2 className="text-2xl font-bold">{tierContent.name}</h2>
            <p className="mt-2 text-lg leading-7 text-primary-4">{tierContent.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        {isPaid && !isCanceling ? (
          <GhostRoundedIconButton
            icon={<ExportOutlined />}
            label="Downgrade plan"
            classNames={{ label: 'font-semibold' }}
            onClick={onDowngrade}
          />
        ) : null}
        <GhostRoundedIconButton
          icon={<ExportOutlined />}
          label="Change subscription"
          classNames={{ label: 'font-semibold' }}
          onClick={onChangeSubscription}
        />
      </div>
    </section>
  );
}

function SubscriptionTiersView({
  data,
  onBack,
}: {
  data: LoadedSubscriptionResponse;
  onBack: () => void;
}) {
  return (
    <section className="flex min-h-full h-full flex-col overflow-hidden w-full rounded-2xl bg-white pb-2 px-4 pt-0">
      <div className="shrink-0 pt-5">
        <GhostRoundedIconButton
          icon={<ArrowLeftOutlined />}
          label="Current subscription"
          classNames={{ label: 'font-semibold', root: 'hover:bg-gray-100' }}
          onClick={onBack}
          iconPosition="start"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden h-full">
        <CheckoutFlow data={data} />
      </div>
    </section>
  );
}

function SubscriptionDowngradeView({ onBack }: { onBack: () => void }) {
  return (
    <section className="bg-primary-10 rounded-2xl p-6">
      <DowngradeFree onBack={onBack} />
    </section>
  );
}

function Content({
  data,
  mode,
  setMode,
  selectionStartTier,
  setSelectionStartTier,
}: {
  data: LoadedSubscriptionResponse;
  mode: TSubscriptionMode;
  setMode: Dispatch<SetStateAction<TSubscriptionMode>>;
  selectionStartTier: TSubscriptionTier | null;
  setSelectionStartTier: Dispatch<SetStateAction<TSubscriptionTier | null>>;
}) {
  const tierKey = data.subscription.tier;

  useEffect(() => {
    if (
      mode === SubscriptionModeDict.Tiers &&
      tierKey &&
      selectionStartTier &&
      tierKey !== selectionStartTier
    ) {
      setMode(SubscriptionModeDict.Current);
      setSelectionStartTier(null);
    }
  }, [mode, selectionStartTier, setMode, setSelectionStartTier, tierKey]);

  const backToCurrent = useCallback(() => {
    setMode(SubscriptionModeDict.Current);
    setSelectionStartTier(null);
  }, [setMode, setSelectionStartTier]);

  const goToChangeSubscription = useCallback(() => {
    setSelectionStartTier(data.subscription.tier);
    setMode(SubscriptionModeDict.Tiers);
  }, [data.subscription.tier, setMode, setSelectionStartTier]);

  const goToDowngrade = useCallback(() => {
    setMode(SubscriptionModeDict.Downgrade);
  }, [setMode]);

  return match(mode)
    .with(SubscriptionModeDict.Tiers, () => (
      <SubscriptionTiersView data={data} onBack={backToCurrent} />
    ))
    .with(SubscriptionModeDict.Downgrade, () => (
      <SubscriptionDowngradeView onBack={backToCurrent} />
    ))
    .with(SubscriptionModeDict.Current, () => (
      <CurrentSubscriptionCard
        data={data}
        onChangeSubscription={goToChangeSubscription}
        onDowngrade={goToDowngrade}
      />
    ))
    .exhaustive();
}

function resolveSubscriptionView(
  isLoading: boolean,
  isError: boolean,
  data: UserActiveSubscriptionResponse | undefined
): SubscriptionViewState {
  if (isLoading) return { tag: 'loading' };
  if (isError || data == null) return { tag: 'error' };
  return { tag: 'ready', data };
}

export function Subscription({ onExpandedChange }: SubscriptionProps) {
  const [mode, setMode] = useState<TSubscriptionMode>(SubscriptionModeDict.Current);
  const [selectionStartTier, setSelectionStartTier] = useState<TSubscriptionTier | null>(null);
  const onExpandedChangeRef = useRef(onExpandedChange);
  onExpandedChangeRef.current = onExpandedChange;

  const { data, isError, isLoading } = useQuery({
    queryKey: keyBuilder.subscription(),
    queryFn: getUserActiveSubscription,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const viewState = resolveSubscriptionView(isLoading, isError, data);

  useEffect(() => {
    onExpandedChangeRef.current?.(mode !== SubscriptionModeDict.Current);
  }, [mode]);

  useEffect(() => {
    return () => onExpandedChangeRef.current?.(false);
  }, []);

  return match(viewState)
    .with({ tag: 'loading' }, () => <SubscriptionLoading />)
    .with({ tag: 'error' }, () => <SubscriptionCheckoutError />) // TODO: Add error state
    .with({ tag: 'ready' }, ({ data: subscriptionData }) => (
      <Content
        data={subscriptionData}
        mode={mode}
        setMode={setMode}
        selectionStartTier={selectionStartTier}
        setSelectionStartTier={setSelectionStartTier}
      />
    ))
    .exhaustive();
}

export default Subscription;
