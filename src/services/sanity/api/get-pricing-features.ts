import { getClient } from '@/services/sanity/client';
import {
  tryType,
  typeBooleanOrNull,
  typeNumberOrNull,
  typeStringOrNull,
} from '@/services/sanity/type-utils';
import { isBoolean } from '@/util/type-guards';
import { logError } from '@/utils/logger';

import type { TypeDef } from '@/util/type-guards';

export interface MultiCurrencyPrice {
  value: number;
  currency: string;
}

export interface ContentForPricingFeaturePlan {
  id: string;
  label?: string | null;
  tooltip?: string | null;
}

export interface ContentForPricingFeatureItem {
  title: string;
  description: string | null;
  plans: ContentForPricingFeaturePlan[];
}

export interface ContentForPricingFeatureBloc {
  title: string;
  available: boolean;
  features: ContentForPricingFeatureItem[];
}

export interface ContentForPricingPlan {
  id: string;
  title: string;
  buttonLabel: string;
  notes: string[];
  price: {
    month: MultiCurrencyPrice[];
    discount?: MultiCurrencyPrice[] | null;
    yearNormal: MultiCurrencyPrice[];
    yearDiscount: MultiCurrencyPrice[];
  };
}

export interface ContentForPricing {
  features: ContentForPricingFeatureBloc[];
  plans: ContentForPricingPlan[];
}

const typeMultiCurrencyPrice: TypeDef = {
  value: typeNumberOrNull,
  currency: typeStringOrNull,
};

const typeMultiCurrencyPriceArray: TypeDef = ['array', typeMultiCurrencyPrice];

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
            id: typeStringOrNull,
            label: typeStringOrNull,
            tooltip: typeStringOrNull,
          },
        ],
      ],
    },
  ],
};

const typeContentForPricingPlan: TypeDef = {
  id: 'string',
  title: 'string',
  buttonLabel: typeStringOrNull,
  notes: ['|', 'null', ['array', 'string']],
  price: {
    month: ['|', 'null', typeMultiCurrencyPriceArray],
    discount: ['|', 'null', typeMultiCurrencyPriceArray],
    yearNormal: ['|', 'null', typeMultiCurrencyPriceArray],
    yearDiscount: ['|', 'null', typeMultiCurrencyPriceArray],
  },
};

function isContentForPricing(data: unknown): data is ContentForPricing {
  return tryType('ContentForPricing', data, {
    features: ['array', typeContentForPricingFeatureBloc],
    plans: ['array', typeContentForPricingPlan],
  });
}

function sanitize(
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
        yearNormal: FAKE_PRICES,
        yearDiscount: FAKE_PRICES,
      };
    }
    if (!plan.price.month) plan.price.month = FAKE_PRICES;
    if (!plan.price.yearNormal) plan.price.yearNormal = FAKE_PRICES;
    if (!plan.price.yearDiscount) plan.price.yearDiscount = FAKE_PRICES;
  }

  return data;
}

export async function getPricingFeatures(): Promise<ContentForPricing | null> {
  try {
    const data = await getClient().fetch(
      `{
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
    buttonLabel,
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
      "yearNormal": yearlyPlanNormal[] {
        "value": price,
        currency
      },
      "yearDiscount": yearlyPlanDiscount[] {
        "value": price,
        currency
      }
    }
  }
}`
    );
    if (isContentForPricing(data)) return sanitize(data) ?? null;
  } catch (ex) {
    logError('Error fetching pricing features:', ex);
  }
  return null;
}
