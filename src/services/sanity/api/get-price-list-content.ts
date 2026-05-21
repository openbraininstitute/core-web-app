import { getClient } from '@/services/sanity/client';
import { tryType, typeNumberOrNull, typeStringOrNull } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

export interface ContentForPriceList2LabBlocSectionPlanItem {
  id: string;
  cost: number;
}

interface ContentForPriceList2LabBlocSectionItem {
  name: string;
  plans: ContentForPriceList2LabBlocSectionPlanItem[];
}

interface ContentForPriceList2LabBlocItem {
  title: string;
  type: string;
  items: ContentForPriceList2LabBlocSectionItem[];
}

export interface ContentForPriceList2LabItem {
  name: string;
  list: ContentForPriceList2LabBlocItem[];
}

interface ContentForPriceList2GeneralPricePlanItem {
  id: string;
  cost: number;
}

export interface ContentForPriceList2GeneralPriceItem {
  currency: string;
  plans: ContentForPriceList2GeneralPricePlanItem[];
}

export interface ContentForPriceList2GeneralItem {
  name: string;
  type: string;
  prices: ContentForPriceList2GeneralPriceItem[];
}

export interface ContentForPriceList2 {
  plans: Array<{
    id: string;
    title: string;
  }>;
  generalList: ContentForPriceList2GeneralItem[];
  labList: ContentForPriceList2LabItem[];
}

function isContentForPriceList2(data: unknown): data is ContentForPriceList2 {
  return tryType('SanityContentForPriceList2', data, {
    labList: [
      'array',
      {
        name: typeStringOrNull,
        list: [
          'array',
          {
            title: typeStringOrNull,
            type: typeStringOrNull,
            items: [
              'array',
              {
                name: typeStringOrNull,
                plans: [
                  'array',
                  {
                    id: 'string',
                    cost: typeNumberOrNull,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    generalList: [
      'array',
      {
        name: 'string',
        type: 'string',
        prices: [
          'array',
          {
            currency: 'string',
            plans: [
              'array',
              {
                id: 'string',
                cost: typeNumberOrNull,
              },
            ],
          },
        ],
      },
    ],
  });
}

const DEFAULT: ContentForPriceList2 = {
  plans: [],
  generalList: [],
  labList: [],
};

export async function getPriceListContent(): Promise<ContentForPriceList2> {
  try {
    const data = await getClient().fetch(
      `{
  "plans": *[_type=="plan"] | order(position) {
    "id": _id,
    title
  },
  "labList": *[_type=="priceList"][0].labList[] {
    name,
    "list": blocList[] {
      title,
      "type": unitType,
      items[] {
        name,
        "plans": prices[] {
          cost,
          "id": plan->_id
        }
      }
    }
  },
  "generalList": *[_type=="priceList"][0].generalItems[] {
    name,
    "type": typeOfCurrency,
    prices[] {
      "currency": name,
      "plans": pricePerPlan[] {
        cost,
        "id": plan->_id
      }
    }
  },
}`
    );
    if (isContentForPriceList2(data)) return data;
  } catch (ex) {
    logError('Error fetching price list content:', ex);
  }
  return DEFAULT;
}
