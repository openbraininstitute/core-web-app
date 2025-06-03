import { PortableTextBlock } from 'next-sanity';
import { StepProps } from '../type';

import { useSanity } from '@/services/sanity';
import { logError } from '@/util/logger';
import { assertType, TypeDef } from '@/util/type-guards';

export function useSanityForSingleTutorial({ slug }: { slug: string }) {
  const query = `
        *[_type=="tutorial" && slug.current == '${slug}'][0]
    {
        _id,
        title,
        description,
        "slug": slug.current,
        "url": videoUrl,
        "imageURL": thumbnail.asset->url,
        "imageWidth": thumbnail.asset->metadata.dimensions.width,
        "imageHeight": thumbnail.asset->metadata.dimensions.height,
        content,
        steps,
        transcript
    }

    `;
  return useSanity(query, isContentForTutorialsList) ?? [];
}

export type ContentForSingleTutorial = {
  url: string;
  title: string;
  slug: string;
  description: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
  content: PortableTextBlock[] | null;
  steps: StepProps[] | null;
  transcript: PortableTextBlock[] | null;
};

const portableTextTypeDef: TypeDef = [
  'array',
  {
    _type: 'string',
    _key: 'string',
    style: ['|', 'string', 'null'],
    children: [
      'array',
      {
        _type: 'string',
        _key: 'string',
        text: 'string',
        marks: ['|', ['array', 'string'], 'null'],
      },
    ],
    markDefs: ['|', ['array', { _key: 'string', _type: 'string' }], 'null'],
    level: ['|', 'number', 'null'],
    listItem: ['|', 'string', 'null'],
  },
];

const stepPropsTypeDef: TypeDef = {
  title: 'string',
  content: ['|', portableTextTypeDef, 'null'],
  time: 'number',
};

function isContentForTutorialsList(data: unknown): data is ContentForSingleTutorial {
  const typeStringOrNull: TypeDef = ['|', 'string', 'null'];
  const typePortableTextOrNull: TypeDef = ['|', portableTextTypeDef, 'null'];
  const typeStepsOrNull: TypeDef = ['|', ['array', stepPropsTypeDef], 'null'];
  try {
    assertType(
      data,
      {
        _id: 'string',
        url: 'string',
        title: typeStringOrNull,
        slug: 'string',
        description: typeStringOrNull,
        imageURL: 'string',
        imageWidth: 'number',
        imageHeight: 'number',
        content: typePortableTextOrNull,
        steps: typeStepsOrNull,
        transcript: typePortableTextOrNull,
      },
      'ContentForSingleTutorial'
    );
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}
