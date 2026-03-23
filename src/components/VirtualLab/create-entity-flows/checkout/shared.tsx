'use client';

import * as SwitchPrimitives from '@radix-ui/react-switch';
import { atom } from 'jotai';
import keyBy from 'es-toolkit/compat/keyBy';
import map from 'es-toolkit/compat/map';
import merge from 'es-toolkit/compat/merge';
import omit from 'es-toolkit/compat/omit';
import { forwardRef } from 'react';

import { getSanityTiers } from '@/services/sanity';
import { listSubscriptionTiers } from '@/api/virtual-lab-svc/queries/subscription';
import { classNames } from '@/util/utils';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

type JsonObject = {
  [key: string]: JsonValue;
};

type JsonArray = Array<JsonValue>;

type PriceValue = {
  value: number;
  currency: string;
};

type TierPrice = {
  month: Array<PriceValue>;
  discount: Array<PriceValue>;
  yearNormal: Array<PriceValue>;
  yearDiscount: Array<PriceValue>;
};

export type TierFeature = {
  title: string;
  specialLabel?: Array<string>;
  tooltip?: Array<string>;
};

type FeatureCategory = {
  title: string;
  available: boolean;
  featuresList: Array<TierFeature>;
};
export type Tier = {
  id: string;
  title: string;
  notes?: Array<string>;
  price?: TierPrice;
  features: Array<FeatureCategory>;
};
export type Interval = 'month' | 'year';

export type ExtendedTier = Tier & {
  app_id: string;
  sanity_id: string;
  prices: Array<{
    id: string;
    amount: number;
    currency: string;
    interval: Interval;
    nickname: string;
    discount: number;
  }>;
  metadata: Record<string, string>;
};

type TiersData = {
  tiers: Tier[];
};

export const flowAtom = atom<{
  step: 'select' | 'pay' | null;
  tier: ExtendedTier | null;
  interval: 'month' | 'year';
  currency?: string;
}>({
  step: 'select',
  tier: null,
  interval: 'month',
  currency: 'chf',
});

export const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    thumbCls: string;
  }
>(({ className, thumbCls, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={classNames(
      'peer inline-flex h-5 w-11 shrink-0 cursor-pointer items-center',
      'data-[state=unchecked]:bg-input border-primary-8 rounded-full border-2 transition-colors',
      'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
      'focus-visible:ring-offset-background data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    // eslint-disable-next-line react/jsx-props-no-spreading
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={classNames(
        'bg-background pointer-events-none block h-3 w-3 rounded-full shadow-lg ring-0 transition-transform',
        'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
        thumbCls
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = 'Switch';

function transformData(data: any): TiersData {
  const transformedTiers: Tier[] = data.plans?.map((plan: any) => {
    const tierFeatures: FeatureCategory[] = data.features?.map((category: any) => {
      // transform features within this category for this plan
      const featuresList = category.features
        ?.map((feature: any) => {
          // Check if this feature is available for the current plan
          const planFeature = feature.plans?.find((p: any) => p.id === plan.id);

          if (!planFeature) {
            return null;
          }
          const transformedFeature: TierFeature = {
            title: feature.title,
          };
          if (planFeature.label) {
            transformedFeature.specialLabel = [planFeature.label];
          }
          if (planFeature.tooltip) {
            transformedFeature.tooltip = [planFeature.tooltip];
          }

          return transformedFeature;
        })
        .filter(Boolean);

      return {
        title: category.title,
        available: category.available,
        featuresList,
      };
    });

    const transformedTier: Tier = {
      id: plan.id,
      title: plan.title,
      features: tierFeatures,
    };

    if (plan.notes && plan.notes.length > 0) {
      transformedTier.notes = plan.notes;
    }

    if (plan.price) {
      transformedTier.price = {
        month: plan.price.month || [],
        discount: plan.price.discount || [],
        yearNormal: plan.price.yearNormal || [],
        yearDiscount: plan.price.yearDiscount || [],
      };
    }

    return transformedTier;
  });

  return {
    tiers: transformedTiers,
  };
}

const renameAndRemove = (arr: Array<any>, oldKey: string, newKey: string) =>
  map(arr, (obj) =>
    obj[oldKey] !== undefined ? { ...omit(obj, oldKey), [newKey]: obj[oldKey] } : obj
  );

export async function getAllTiers(): Promise<Array<ExtendedTier>> {
  const [appTiers, sanityTiers] = await Promise.all([
    listSubscriptionTiers(),
    getSanityTiers(),
  ]);
  if (!appTiers || !sanityTiers) {
    throw new Error('Tiers can not be fetched');
  }
  const tiers1 = keyBy(renameAndRemove(appTiers.tiers, 'id', 'app_id'), 'sanity_id');
  const tiers2 = keyBy(transformData(sanityTiers).tiers, 'id');
  const tiers = Object.values(merge({}, tiers1, tiers2));

  return tiers;
}
