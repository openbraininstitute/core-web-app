/* eslint-disable no-param-reassign */
import { tryType, typeImage } from './_common';

import query from './milestones.groq';
import { typeStringOrNull } from './types';
import { useSanity } from '@/services/sanity';

interface ContentForMilestoneItem {
  title: string;
  description: string;
  astrocytes: string | null;
  neurons: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

type ContentForMilestones = ContentForMilestoneItem[];

function isContentForMilestones(data: unknown): data is ContentForMilestones {
  return tryType('ContentForNews', data, [
    'array',
    {
      title: 'string',
      description: 'string',
      astrocytes: typeStringOrNull,
      neurons: 'string',
      ...typeImage,
    },
  ]);
}

export function useSanityContentForMilestones(): ContentForMilestones {
  return useSanity(query, isContentForMilestones) ?? [];
}
