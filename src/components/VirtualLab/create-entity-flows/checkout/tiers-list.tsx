'use client';

import { useQuery } from '@tanstack/react-query';
import { noop } from 'es-toolkit/compat';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { match } from 'ts-pattern';

import { tryCatch } from '@/api/utils';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import ContactUs from '@/components/VirtualLab/create-entity-flows/checkout/contact-us';
import DowngradeFree from '@/components/VirtualLab/create-entity-flows/checkout/downgrade';
import {
  flowAtom,
  getAllTiers,
  type TExtendedTier,
} from '@/components/VirtualLab/create-entity-flows/checkout/shared';
import { TiersListSkeleton } from '@/components/VirtualLab/create-entity-flows/checkout/skeleton';
import { getPricingContent } from '@/services/sanity';
import { Button } from '@/ui/molecules/button';
import PlanCard from '@/ui/segments/plans/card';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { UserActiveSubscriptionResponse } from '@/api/virtual-lab-svc/queries/types';
import type { PlanV2 } from '@/types/virtual-lab/pricing';

type Props = {
  currentTier?: 'FREE' | 'PRO' | 'PREMIUM';
  subscriptionData: UserActiveSubscriptionResponse;
};

const TiersStep = {
  Listing: 'listing',
  ContactUs: 'contact-us',
  Downgrade: 'downgrade',
} as const;

type TTiersStep = (typeof TiersStep)[keyof typeof TiersStep];

function TiersCards({
  currentTier,
  tiers,
  plans,
  onSelectPremiumTier,
  onSelectFree,
  subscriptionData,
}: {
  currentTier?: 'FREE' | 'PRO' | 'PREMIUM';
  tiers: TExtendedTier[];
  plans: PlanV2[];
  onSelectPremiumTier: () => void;
  onSelectFree: () => void;
  subscriptionData: UserActiveSubscriptionResponse;
}) {
  const [, updateFlowState] = useAtom(flowAtom);

  const { data: virtualLabData, isPending } = useQuery({
    queryKey: keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB] }),
    queryFn: async () => await listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
  });

  const onTierClick = (t: TExtendedTier) => () => {
    if (t.title === 'Pro' && t.app_id) {
      if (!isPending && !virtualLabData?.data?.virtual_lab.email_verified) {
        updateFlowState((prev) => ({ ...prev, tier: t, step: 'email-verification' }));
      } else {
        updateFlowState((prev) => ({ ...prev, tier: t, step: 'pay' }));
      }
    }
  };

  const fallbackOrder = ['Free', 'Pro', 'Enterprise', 'Education'];
  const sortedPlans = [...plans].sort((a, b) => {
    if (a.planOrder != null && b.planOrder != null) return a.planOrder - b.planOrder;
    if (a.planOrder != null) return -1;
    if (b.planOrder != null) return 1;
    const aIdx = fallbackOrder.indexOf(a.name);
    const bIdx = fallbackOrder.indexOf(b.name);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });

  const findTier = (planName: string) =>
    tiers.find((t) => t.title.toLowerCase() === planName.toLowerCase());

  const getCta = (plan: PlanV2) => {
    const tier = findTier(plan.name);
    const isCurrentTier = currentTier?.toLowerCase() === plan.name.toLowerCase();
    const isCurrentTierPremium = currentTier?.toLowerCase() === 'premium';
    const isFree = plan.name.toLowerCase() === 'free';
    const isPro = plan.name.toLowerCase() === 'pro';
    const isPremium =
      plan.name.toLowerCase() === 'premium' || plan.name.toLowerCase() === 'enterprise';
    const isEducation = plan.name.toLowerCase() === 'education';

    if (isCurrentTier) return { label: 'Current plan', disabled: true, onClick: noop };
    if (isFree && !currentTier) return { label: 'Current plan', disabled: true, onClick: noop };

    if (
      subscriptionData?.subscription.canceled_at ||
      subscriptionData?.subscription.cancel_at_period_end
    ) {
      if (isPro || isFree) return null;
    }
    if (isCurrentTierPremium && isPro) return null;

    if (isFree) return { label: 'Downgrade to Free', disabled: false, onClick: onSelectFree };
    if (isPro && tier)
      return { label: 'Upgrade to Pro', disabled: false, onClick: onTierClick(tier) };
    if (isPremium || isEducation)
      return { label: 'Contact Us', disabled: false, onClick: onSelectPremiumTier };

    return null;
  };

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
      {sortedPlans.map((plan) => {
        const cta = getCta(plan);
        const isCurrentTier =
          currentTier?.toLowerCase() === plan.name.toLowerCase() ||
          (plan.name.toLowerCase() === 'free' && !currentTier);

        return (
          <div key={plan.name} className="flex flex-col overflow-hidden rounded-xl gap-y-4">
            <PlanCard
              plan={plan}
              dark
              hideContactButton
              className={isCurrentTier ? 'bg-primary-7 border-primary-5' : undefined}
            />
            {cta && (
              <div className="px-6 pb-6">
                <Button
                  rounded
                  type="button"
                  variant={cta.disabled ? 'ghost' : 'outline'}
                  size="lg"
                  className={cn(
                    'w-full border-primary-5 text-white',
                    cta.disabled && 'pointer-events-none',
                    !cta.disabled && 'bg-transparent hover:bg-primary-8'
                  )}
                  disabled={cta.disabled}
                  onClick={cta.onClick}
                >
                  {cta.label}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TiersList({ currentTier, subscriptionData }: Props) {
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<{ data: Array<TExtendedTier> } | { error: unknown }>({
    data: [],
  });
  const [plans, setPlans] = useState<PlanV2[]>([]);
  const [currentStep, setCurrentStep] = useState<TTiersStep>(TiersStep.Listing);

  const onSelectPremiumTier = () => setCurrentStep(TiersStep.ContactUs);
  const onDowngradeFreeClick = () => setCurrentStep(TiersStep.Downgrade);
  const onBackToListing = () => setCurrentStep(TiersStep.Listing);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [tiersResult, plansData] = await Promise.all([
        tryCatch(getAllTiers(), noop),
        getPricingContent().catch(() => []),
      ]);

      if (tiersResult.error) {
        setTiers({ error: tiersResult.error });
      } else {
        setTiers({ data: tiersResult.data });
      }
      setPlans(plansData ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <TiersListSkeleton />;
  if ('error' in tiers)
    return (
      <div className="mb-6 transform rounded-xs bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-red-200">
              Unable to load subscription tiers
            </h2>
            <p className="max-w-xl text-red-200/80">
              We&lsquo;re having trouble loading the subscription tiers.
              <br />
              Please try refreshing the page or contact support if the issue persists.
            </p>
          </div>
          <div className="mb-2 flex items-center gap-2 self-baseline">
            <Button
              rounded
              type="button"
              variant="ghost"
              size="lg"
              className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );

  return (
    <div id="tiers-list-container" className="mx-auto flex h-full max-w-7xl flex-col">
      {match({ currentStep })
        .with({ currentStep: TiersStep.ContactUs }, () => (
          <div className="h-full grow px-6 py-3">
            <ContactUs onBack={onBackToListing} />
          </div>
        ))
        .with({ currentStep: TiersStep.Downgrade }, () => (
          <div className="h-full grow px-6 py-3">
            <DowngradeFree onBack={onBackToListing} />
          </div>
        ))
        .otherwise(() => (
          <TiersCards
            tiers={'data' in tiers ? tiers.data : []}
            plans={plans}
            currentTier={currentTier}
            onSelectPremiumTier={onSelectPremiumTier}
            onSelectFree={onDowngradeFreeClick}
            subscriptionData={subscriptionData}
          />
        ))}
    </div>
  );
}
