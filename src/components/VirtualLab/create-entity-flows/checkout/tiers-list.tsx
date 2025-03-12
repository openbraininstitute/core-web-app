'use client';

import { useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button, Tooltip } from 'antd';
import { CheckCircleFilled, InfoCircleOutlined } from '@ant-design/icons';
import kebabCase from 'lodash/kebabCase';
import toUpper from 'lodash/toUpper';

import ContactUs from '@/components/VirtualLab/create-entity-flows/checkout/contact-us';
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
import { tryCatch } from '@/api/utils';

type Props = {
  currentTier?: 'FREE' | 'PRO' | 'PREMIUM';
  canSelect?: boolean;
  onNextStep: () => void;
};

type TiersComparisonPros = {
  currentTier?: 'FREE' | 'PRO' | 'PREMIUM';
  canSelect?: boolean;
  tiers: Array<ExtendedTier>;
  onSelectPremiumTier: () => void;
};

function TiersComparison({
  currentTier,
  canSelect,
  tiers,
  onSelectPremiumTier,
}: TiersComparisonPros) {
  const [{ interval, currency, tier }, updateFlowState] = useAtom(flowAtom);
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);
  const onTierClick = (t: ExtendedTier) => () => {
    if (t.title === 'Pro') updateFlowState((prev) => ({ ...prev, tier: t }));
    if (t.title === 'Premium') onSelectPremiumTier();
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
    if (!available && !feature?.title) return <span className="text-gray-400">—</span>;
    if (!available && feature?.title)
      return (
        <span className="text-gray-400">
          <CheckCircleFilled className="text-lg text-gray-500" />
        </span>
      );

    if (feature?.specialLabel) {
      return (
        <div className="flex items-center">
          <span className="text-green-500">{feature?.specialLabel}</span>
          {feature.tooltip && (
            <Tooltip
              title={feature.tooltip[0]}
              overlayClassName="[&_.ant-tooltip-inner]:bg-primary-8 [&_.ant-tooltip-inner]:text-white [&_.ant-tooltip-inner]:rounded-none [&_.ant-tooltip-arrow]:before:bg-primary-8"
            >
              <InfoCircleOutlined className="ml-1 text-white" />
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
    <div className="relative flex h-full max-h-[85vh] w-full flex-col bg-primary-9 p-6 pb-24 text-white">
      <div
        id="tier-highlighter"
        className="pointer-events-none absolute bottom-[40px] left-[20px] right-[20px] top-[10px] grid grid-cols-4 gap-6"
      >
        <div />
        {tiers.map((t) => {
          const isSelected =
            (tier && t.app_id === tier?.app_id) ||
            currentTier?.toLowerCase() === t.title.toLowerCase();
          const isHovered = hoveredTier === t.id;

          return (
            <div
              key={`${t.id}-bg`}
              className={classNames(
                'rounded-sm',
                isSelected && 'bg-primary-8/90',
                isHovered && !isSelected && 'bg-primary-8/40'
              )}
            />
          );
        })}
      </div>

      <div
        id="tier-header"
        className="sticky top-0 z-10 grid grid-cols-4 gap-6 bg-transparent pb-6"
      >
        <div />
        {tiers.map((t) => {
          return (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <div
              role="button"
              aria-label="tier-btn"
              tabIndex={0}
              key={`tier-btn${t.id}`}
              className={classNames(
                'relative flex flex-col bg-transparent px-4',
                t.title === 'Free' ? 'cursor-default' : 'cursor-pointer',
                t.title === 'Pro' && !canSelect && 'pointer-events-none cursor-not-allowed'
              )}
              onMouseEnter={() => setHoveredTier(t.id)}
              onMouseLeave={() => setHoveredTier(null)}
              onClick={onTierClick(t)}
              aria-disabled={t.title === 'Pro' && !canSelect}
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
                      className="!border border-white p-1"
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
                      <span className="text-lg font-light text-primary-5 line-through">
                        {getPriceDisplay(t).mainPrice}/
                        <span className="text-sm font-light">{interval}</span>
                      </span>
                      <span className="ml-1 text-xl font-bold text-white">
                        {getPriceDisplay(t).discountPrice}/
                        <span className="text-sm font-light">{interval}</span>
                      </span>
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
      <div className="flex-1 overflow-y-auto">
        {allCategories.map((category) => (
          <div id="tier-details" key={`${kebabCase(category.title)}`} className="relative mt-8">
            <h3 className="mb-4 uppercase text-primary-4">
              <span className="text-base font-bold">{category.title}</span>
              {category.available === false && (
                <span className="select ml-3 rounded-full border border-white px-2 py-1 text-xs !font-light text-white">
                  Future release
                </span>
              )}
            </h3>

            {category.features.map((feature) => (
              <div
                key={`${kebabCase(category.title)}/${kebabCase(feature)}`}
                className="relative grid grid-cols-4 gap-6 py-2"
              >
                <div className="text-base">{feature}</div>

                {tiers.map((t) => (
                  <div
                    key={`${t.id}-${feature}`}
                    className="flex justify-center px-4"
                    onMouseEnter={() => setHoveredTier(t.id)}
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
    </div>
  );
}

export default function TiersList({ currentTier, canSelect, onNextStep }: Props) {
  const { tier } = useAtomValue(flowAtom);
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<{ data: Array<ExtendedTier> } | { error: any }>({ data: [] });
  const [open, setOpen] = useState<boolean>(false);
  const disabled = !tier?.app_id;

  const onSelectPremiumTier = () => setOpen(true);
  const onClosePremiumTier = () => setOpen(false);

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
      <div className="mb-6 transform rounded-sm bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
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
              type="text"
              size="large"
              onClick={() => window.location.reload()}
              className="rounded-none px-6 py-2 text-white hover:!text-white"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl">
      <TiersComparison
        tiers={tiers.data}
        canSelect={canSelect}
        currentTier={currentTier}
        onSelectPremiumTier={onSelectPremiumTier}
      />
      <ContactUs isOpen={open} onClose={onClosePremiumTier} />
      {canSelect && (
        <div className="fixed bottom-6 right-6">
          <Button
            key="create-project-btn"
            className={classNames(
              'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
              'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
              'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
              'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
            )}
            type="default"
            size="large"
            htmlType="button"
            disabled={disabled}
            onClick={onNextStep}
          >
            To payment
          </Button>
        </div>
      )}
    </div>
  );
}
