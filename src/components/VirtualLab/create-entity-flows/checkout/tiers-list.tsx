'use client';

import { CheckCircleFilled, InfoCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { match } from 'ts-pattern';
import { Tooltip } from 'antd';
import { useAtom } from 'jotai';
import kebabCase from 'es-toolkit/compat/kebabCase';
import toUpper from 'es-toolkit/compat/toUpper';
import noop from 'es-toolkit/compat/noop';

import { tryCatch } from '@/api/utils';
import { UserActiveSubscriptionResponse } from '@/api/virtual-lab-svc/queries/types';
import ContactUs from '@/components/VirtualLab/create-entity-flows/checkout/contact-us';
import DowngradeFree from '@/components/VirtualLab/create-entity-flows/checkout/downgrade';
import {
  ExtendedTier,
  flowAtom,
  getAllTiers,
  Switch,
  Tier,
  TierFeature,
} from '@/components/VirtualLab/create-entity-flows/checkout/shared';
import { TiersListSkeleton } from '@/components/VirtualLab/create-entity-flows/checkout/skeleton';
import { classNames } from '@/util/utils';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

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

type TiersComparisonPros = {
  currentTier?: 'FREE' | 'PRO' | 'PREMIUM';
  tiers: Array<ExtendedTier>;
  onSelectPremiumTier: () => void;
  onSelectFree: () => void;
  subscriptionData: UserActiveSubscriptionResponse;
};

function TiersComparison({
  currentTier,
  tiers,
  onSelectPremiumTier,
  onSelectFree,
  subscriptionData,
}: TiersComparisonPros) {
  const [{ interval, currency }, updateFlowState] = useAtom(flowAtom);
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);
  const onTierClick = (t: ExtendedTier) => () => {
    if (t.title === 'Pro' && t.app_id) {
      updateFlowState((prev) => ({ ...prev, tier: t, step: 'pay' }));
    }
  };

  const getCurrencySymbol = (c: string) => {
    switch (c) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'CHF':
        return 'CHF';
      default:
        return c;
    }
  };

  const onChangeInterval = (value: boolean) =>
    updateFlowState((prev) => ({
      ...prev,
      interval: value ? 'year' : 'month',
    }));

  const getPriceDisplay = (t: Tier) => {
    if (!t.price) return { mainPrice: '0', discountPrice: null };

    const priceArray = interval === 'month' ? t.price.month : t.price.yearNormal;
    const discountArray = interval === 'month' ? t.price.discount : t.price.yearDiscount;

    if (!priceArray || !priceArray.find((o) => o.currency === toUpper(currency))) {
      return { mainPrice: '0', discountPrice: null };
    }

    const price = priceArray.find((o) => o.currency === toUpper(currency));
    const discount = discountArray.find((o) => o.currency === toUpper(currency));

    const currencySymbol = getCurrencySymbol(price?.currency || '');
    const mainPrice = `${currencySymbol} ${price?.value || 0}`;
    const discountPrice =
      discount && discount.value > 0 ? `${currencySymbol} ${discount.value}` : null;

    return { mainPrice, discountPrice };
  };

  const renderFeatureAvailability = (available: boolean, feature?: TierFeature) => {
    if (!available && !feature?.title) return <span className="text-primary-4">—</span>;
    if (!available && feature?.title)
      return (
        <span className="text-gray-400">
          <CheckCircleFilled className="text-primary-4 text-lg" />
        </span>
      );

    if (feature?.specialLabel) {
      return (
        <div className="flex items-center">
          <span className="text-green-500">{feature?.specialLabel}</span>
          {feature.tooltip && (
            <Tooltip
              title={feature.tooltip[0]}
              rootClassName="[&_.ant-tooltip-inner]:bg-primary-8 [&_.ant-tooltip-inner]:text-white [&_.ant-tooltip-inner]:rounded-none [&_.ant-tooltip-arrow]:before:bg-primary-8"
            >
              <InfoCircleOutlined className="ml-1 text-green-500" />
            </Tooltip>
          )}
        </div>
      );
    }

    return <CheckCircleFilled className="text-lg text-green-500" />;
  };

  const isFeatureAvailable = (t: Tier, categoryTitle: string, featureTitle: string) => {
    const category = t.features.find((cat) => cat.title === categoryTitle);
    if (!category || !category.available) return false;

    const feature = category.featuresList.find((f) => f.title === featureTitle);
    return !!feature;
  };

  const getFeatureDetails = (
    t: Tier,
    categoryTitle: string,
    featureTitle: string
  ): TierFeature | undefined => {
    const category = t.features.find((cat) => cat.title === categoryTitle);
    if (!category) return undefined;

    return category.featuresList.find((f) => f.title === featureTitle);
  };

  const allCategories: { title: string; available?: boolean; features: string[] }[] = [];

  tiers?.forEach((t) => {
    t.features.forEach((category) => {
      let existingCategory = allCategories.find((c) => c.title === category.title);

      if (!existingCategory) {
        existingCategory = { title: category.title, available: category.available, features: [] };
        allCategories.push(existingCategory);
      }

      category.featuresList.forEach((feature) => {
        if (!existingCategory.features.includes(feature.title)) {
          existingCategory.features.push(feature.title);
        }
      });
    });
  });

  return (
    <div
      data-testid="tiers-list"
      id="tiers-list"
      className="bg-primary-9 relative flex h-full max-h-full w-full flex-col overflow-hidden px-6 py-2 text-white"
    >
      <div
        id="tier-highlighter"
        className="pointer-events-none absolute top-[10px] right-[20px] bottom-[55px] left-[20px] grid grid-cols-4 gap-6"
      >
        <div />
        {tiers.map((t) => {
          const isSelected = currentTier?.toLowerCase() === t.title.toLowerCase();
          const isCurrentTier = currentTier?.toLowerCase() === t.title.toLowerCase();
          const isHovered = hoveredTier === t.app_id;
          const isFree = t.title === 'Free' && (isCurrentTier || !currentTier);

          return (
            <div
              id={`${t.id}-bg`}
              key={`${t.id}-bg`}
              className={classNames(
                'rounded-lg',
                (isSelected || isFree) && 'border-primary-3 bg-primary-8/90 border-2',
                isHovered && !isSelected && 'bg-primary-5/20'
              )}
            />
          );
        })}
      </div>

      <div
        id="tier-header"
        className="sticky top-0 z-10 grid grid-cols-4 gap-6 bg-transparent pt-4 pb-6"
      >
        <div />
        {tiers.map((t) => {
          return (
            <div
              key={`tier-btn${t.id}`}
              className="relative flex flex-col bg-transparent px-4"
              onMouseEnter={() => setHoveredTier(t.app_id)}
              onMouseLeave={() => setHoveredTier(null)}
              data-testid="tier-header"
            >
              <h2 className="mb-2 text-2xl font-bold">{t.title}</h2>
              {t.price && t.title === 'Pro' && (
                <div className="mb-4 text-left">
                  <div className="mb-3 flex items-center gap-1">
                    <span
                      className={classNames(
                        'text-sm font-light text-white',
                        interval === 'month' && 'font-bold'
                      )}
                    >
                      Monthly
                    </span>
                    <Switch
                      checked={interval === 'year'}
                      name="interval"
                      thumbCls="bg-white"
                      className="border! border-white p-1"
                      onCheckedChange={onChangeInterval}
                    />
                    <span
                      className={classNames(
                        'text-sm font-light text-white',
                        interval === 'month' && 'font-bold'
                      )}
                    >
                      Yearly
                    </span>
                  </div>
                  {getPriceDisplay(t).discountPrice ? (
                    <div className="flex flex-col text-gray-400">
                      <span className="text-primary-5 text-lg font-light line-through">
                        {getPriceDisplay(t).mainPrice}/
                        <span className="text-sm font-light">{interval}</span>
                      </span>
                      <div className="flex">
                        <span className="ml-1 text-xl font-bold text-white">
                          {getPriceDisplay(t).discountPrice}/
                          <span className="text-sm font-light">{interval}</span>
                        </span>
                        <span className="border-primary-2 text-primary-2 ml-2 rounded-full border px-3 py-1 text-sm">
                          Launch Price
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      <span className="text-xl font-bold text-white">
                        {getPriceDisplay(t).mainPrice}/
                        <span className="text-sm font-light">{interval}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {t.notes && (
                <div className="mt-auto space-y-1 text-sm">
                  {t.notes.map((note: string) => (
                    <div key={note} className="flex">
                      <span className="mr-1 text-xs">+</span> {note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable content section */}
      <div id="tier-details-container" className="no-scrollbar flex-1 overflow-y-auto">
        {allCategories.map((category) => (
          <div id="tier-details" key={`${kebabCase(category.title)}`} className="relative mt-8">
            <h3 className="text-primary-4 mb-4 uppercase">
              <span className="text-base font-bold">{category.title}</span>
              {category.available === false && (
                <span className="select ml-3 rounded-full border border-white px-2 py-1 text-xs font-light! text-white">
                  Future release
                </span>
              )}
            </h3>

            {category.features.map((feature) => (
              <div
                key={`${kebabCase(category.title)}/${kebabCase(feature)}`}
                className="relative grid grid-cols-4 gap-6 py-3"
              >
                <div className="text-base">{feature}</div>

                {tiers.map((t) => (
                  <div
                    key={`${t.id}-${feature}`}
                    className="flex justify-start px-4"
                    onMouseEnter={() => setHoveredTier(t.app_id)}
                    onMouseLeave={() => setHoveredTier(null)}
                  >
                    {renderFeatureAvailability(
                      isFeatureAvailable(t, category.title, feature),
                      getFeatureDetails(t, category.title, feature)
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div
        id="tier-buttons-container"
        className="sticky bottom-0 z-10 grid grid-cols-4 gap-6 bg-transparent pt-4"
      >
        <div />
        {tiers.map((t) => {
          const isCurrentTier = currentTier?.toLowerCase() === t.title.toLowerCase();
          const isCurrentTierPremium = currentTier?.toLowerCase() === 'premium';
          const isFree = t.title === 'Free';
          const isPro = t.title === 'Pro';
          const isPremium = t.title === 'Premium';
          // const isHovered = hoveredTier === t.app_id;
          if (isFree && (isCurrentTier || !currentTier)) return <div key="free-disabled" />;
          if (isPro && isCurrentTier) return <div key="pro-disabled" />;

          if (
            subscriptionData?.subscription.canceled_at ||
            subscriptionData?.subscription.cancel_at_period_end
          ) {
            if (isPro || isFree) return <div key="tier-disabled" />;
          }
          if (isCurrentTierPremium && isPro) return <div key="pro-disabled" />;

          let controller = noop;
          if (isFree) controller = onSelectFree;
          if (isPro) controller = onTierClick(t);
          if (isPremium) controller = onSelectPremiumTier;
          return (
            <div
              key={`button-${t.app_id}`}
              className="relative px-4"
              onMouseEnter={() => setHoveredTier(t.app_id)}
              onMouseLeave={() => setHoveredTier(null)}
            >
              <Button
                rounded
                type="button"
                variant="default"
                size="lg"
                className={cn(
                  'border-primary-4! w-max border shadow-2xl',
                  'hover:bg-primary-8/40',
                  'hover:shadow-[1px_2px_4px_0px_#00000099]',
                  'shadow-[8px_12px_24px_0px_#00000099]',
                  'shadow-[-8px_-8px_42px_0px_#FFFFFF29]'
                )}
                data-testid={`select-${t.title.toLowerCase()}-btn`}
                onClick={controller}
              >
                {isFree && !isCurrentTier && 'Downgrade to Free'}
                {isPro && !isCurrentTier && !isCurrentTierPremium && 'Upgrade to Pro'}
                {isPremium && 'Contact Us'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TiersList({ currentTier, subscriptionData }: Props) {
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<{ data: Array<ExtendedTier> } | { error: any }>({ data: [] });
  const [currentStep, setCurrentStep] = useState<TTiersStep>(TiersStep.Listing);

  const onSelectPremiumTier = () => setCurrentStep(TiersStep.ContactUs);
  const onDowngradeFreeClick = () => setCurrentStep(TiersStep.Downgrade);
  const onBackToListing = () => setCurrentStep(TiersStep.Listing);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await tryCatch(getAllTiers(), () => {
        setLoading(false);
      });
      if (error) {
        return setTiers({ error });
      }
      setTiers({ data });
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
    <div id="tiers-list-container" className="mx-auto flex h-full max-w-6xl flex-col">
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
          <TiersComparison
            tiers={tiers.data}
            currentTier={currentTier}
            onSelectPremiumTier={onSelectPremiumTier}
            onSelectFree={onDowngradeFreeClick}
            subscriptionData={subscriptionData}
          />
        ))}
    </div>
  );
}
