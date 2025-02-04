/* eslint-disable no-param-reassign */
import { tryType } from './_common';
import { useSanity } from './content';
import { typeBooleanOrNull, typeNumberOrNull, typeStringOrNull } from './types';
import { isBoolean, TypeDef } from '@/util/type-guards';

export function useSanityContentForPricing(): ContentForPricing | undefined | null {
  const query = `{
  "features": *[_type=="featureBlocList"].featuresBloc[] {
    title,
    "available": isAvailable,
    features[] {
      title,
      description,
      "plans": linkedPlan[]{
        "id": plan->_id,
        "label": specialLabel,
        tooltip
      }
    }
  },
  "plans": *[_type=="plan"] | order(position) {
    "id": _id,
    title,
    notes,
    "price": {
      "month": monthlyPlanNormal[] {
        "value": price,
        currency
      },
      "discount": monthlyPlanDiscount[] {
        "value": price,
        currency
      },
      "year": yearlyPlan[] {
        "value": price,
        currency
      }
    }
  }
}`;
  return sanityze(useSanity(query, isContentForPricing));
}

function isContentForPricing(data: unknown): data is ContentForPricing {
  return tryType('ContentForPricing', data, {
    features: ['array', typeContentForPricingFeatureBloc],
    plans: ['array', typeContentForPricingPlan],
  });
}

const typeContentForPricingFeatureBloc: TypeDef = {
  title: 'string',
  available: typeBooleanOrNull,
  features: [
    'array',
    {
      title: 'string',
      description: typeStringOrNull,
      plans: [
        '|',
        'null',
        [
          'array',
          {
            id: 'string',
            label: typeStringOrNull,
            tooltip: typeStringOrNull,
          },
        ],
      ],
    },
  ],
};

export interface ContentForPricing {
  features: ContentForPricingFeatureBloc[];
  plans: ContentForPricingPlan[];
}

export interface ContentForPricingFeatureBloc {
  title: string;
  available: boolean;
  features: ContentForPricingFeatureItem[];
}

export interface ContentForPricingFeatureItem {
  title: string;
  description: string | null;
  plans: ContentForPricingFeaturePlan[];
}

export interface ContentForPricingFeaturePlan {
  id: string;
  label?: string | null;
  tooltip?: string | null;
}

const typeMultiCurrencyPrice: TypeDef = {
  value: typeNumberOrNull,
  currency: typeStringOrNull,
};

const typeMultiCurrencyPriceArray: TypeDef = ['array', typeMultiCurrencyPrice];

export interface MultiCurrencyPrice {
  value: number;
  currency: string;
}

const typeContentForPricingPlan: TypeDef = {
  id: 'string',
  title: 'string',
  notes: ['|', 'null', ['array', 'string']],
  price: {
    month: ['|', 'null', typeMultiCurrencyPriceArray],
    discount: ['|', 'null', typeMultiCurrencyPriceArray],
    year: ['|', 'null', typeMultiCurrencyPriceArray],
  },
};

export interface ContentForPricingPlan {
  id: string;
  title: string;
  notes: string[];
  price: {
    month: MultiCurrencyPrice[];
    discount?: MultiCurrencyPrice[] | null;
    year: MultiCurrencyPrice[];
  };
}

function sanityze(
  data: ContentForPricing | null | undefined
): ContentForPricing | null | undefined {
  if (!data) return data;

  if (!data.features) data.features = [];
  for (const feature of data.features) {
    if (!feature.title) feature.title = '';
    if (!isBoolean(feature.available)) feature.available = false;
    if (!feature.features) feature.features = [];
    for (const item of feature.features) {
      if (!item.plans) item.plans = [];
    }
  }
  if (!data.plans) data.plans = [];
  const FAKE_PRICES: MultiCurrencyPrice[] = [];
  for (const plan of data.plans) {
    if (!plan.notes) plan.notes = [];
    if (!plan.price) {
      plan.price = {
        month: FAKE_PRICES,
        year: FAKE_PRICES,
      };
    }
    if (!plan.price.month) plan.price.month = FAKE_PRICES;
    if (!plan.price.year) plan.price.year = FAKE_PRICES;
  }

  return data;
}
