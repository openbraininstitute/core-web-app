import { tryType, typeNumberOrNull, typeStringOrNull } from '../../content';
import { useSanity } from '../../content/content';
import query from './hooks.groq';

export function useSanityContentForPriceList2(): ContentForPriceList2 {
  return (
    useSanity(query, isSanityContentForPriceList2) ?? {
      plans: [],
      generalList: [],
      labList: [],
    }
  );
}

export interface ContentForPriceList2 {
  plans: Array<{
    id: string;
    title: string;
  }>;
  generalList: ContentForPriceList2GeneralItem[];
  labList: ContentForPriceList2LabItem[];
}

export interface ContentForPriceList2LabItem {
  name: string;
  list: ContentForPriceList2LabBlocItem[];
}

export interface ContentForPriceList2LabBlocItem {
  title: string;
  type: string;
  items: ContentForPriceList2LabBlocSectionItem[];
}

export interface ContentForPriceList2LabBlocSectionItem {
  name: string;
  plans: ContentForPriceList2LabBlocSectionPlanItem[];
}

export interface ContentForPriceList2LabBlocSectionPlanItem {
  id: string;
  cost: number;
}

export interface ContentForPriceList2GeneralItem {
  name: string;
  type: string;
  prices: ContentForPriceList2GeneralPriceItem[];
}

export interface ContentForPriceList2GeneralPriceItem {
  currency: string;
  plans: ContentForPriceList2GeneralPricePlanItem[];
}

export interface ContentForPriceList2GeneralPricePlanItem {
  id: string;
  cost: number;
}

export function isSanityContentForPriceList2(data: unknown): data is ContentForPriceList2 {
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
